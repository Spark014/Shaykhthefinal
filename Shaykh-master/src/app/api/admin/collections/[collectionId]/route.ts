
// src/app/api/admin/collections/[collectionId]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey 
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

const firebaseAdminSdkConfigString = process.env.FIREBASE_ADMIN_SDK_CONFIG;
let firebaseAdminApp: admin.app.App;

function initializeFirebaseAdmin() {
  const appName = 'adminApiCollectionsModify'; 
  if (admin.apps.some(app => app?.name === appName)) {
    firebaseAdminApp = admin.app(appName);
    return;
  }
  if (firebaseAdminSdkConfigString) {
    try {
      let serviceAccount: ServiceAccount;
      if (firebaseAdminSdkConfigString.startsWith('{')) {
        serviceAccount = JSON.parse(firebaseAdminSdkConfigString) as ServiceAccount;
      } else {
        serviceAccount = require(firebaseAdminSdkConfigString);
      }
      firebaseAdminApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }, appName);
    } catch (e: any) {
      console.error(`API Route (${appName}): CRITICAL - Firebase Admin SDK initialization error:`, e.message);
    }
  } else {
    console.error(`API Route (${appName}): CRITICAL - FIREBASE_ADMIN_SDK_CONFIG missing.`);
  }
}

initializeFirebaseAdmin();

const UpdateCollectionSchema = z.object({
  name: z.string().min(1, { message: "Collection name is required." }).optional(),
  description: z.string().optional().nullable(),
  cover_image_url: z.string().url({ message: "Invalid cover image URL." }).optional().nullable().or(z.literal("")),
  language: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  collection_content_type: z.enum(['book', 'audio', 'video']).nullable().optional(),
});


export async function PATCH(
  request: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  const { collectionId } = params;

  if (!firebaseAdminApp || !supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized: Missing or invalid token.' }, { status: 401 });
  }
  const idToken = authHeader.split('Bearer ')[1];

  try {
    await firebaseAdminApp.auth().verifyIdToken(idToken);

    const rawBody = await request.json();
    const parseResult = UpdateCollectionSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid request payload.", issues: parseResult.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const collectionData = parseResult.data;

    // Uniqueness check if relevant fields are being updated
    if (collectionData.name || collectionData.collection_content_type || collectionData.category) {
      const { data: currentCol, error: fetchError } = await supabaseAdmin
        .from('collections')
        .select('name, collection_content_type, category')
        .eq('id', collectionId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { 
         console.error('API Route (Collections PATCH): Error fetching current collection details for uniqueness check:', fetchError);
      }

      const checkName = collectionData.name ?? currentCol?.name;
      const checkType = collectionData.collection_content_type ?? currentCol?.collection_content_type;
      const checkCategory = collectionData.category ?? currentCol?.category;
      
      if (checkName && checkType && checkCategory) { 
        const { data: potentialDuplicates, error: checkError } = await supabaseAdmin
          .from('collections')
          .select('id')
          .eq('name', checkName)
          .eq('collection_content_type', checkType)
          .eq('category', checkCategory)
          .neq('id', collectionId) 
          .maybeSingle(); 

        if (checkError) {
          console.error('API Route (Collections PATCH): Supabase error checking for existing collection during update:', checkError);
        }
        if (potentialDuplicates) {
          return NextResponse.json({ error: 'A collection with this name, content type, and category already exists.' }, { status: 409 });
        }
      }
    }
    
    const dataToUpdate: Partial<typeof collectionData> = { ...collectionData };
    if (collectionData.cover_image_url === "") { 
        dataToUpdate.cover_image_url = null;
    }

    const { data: updatedCollection, error: supabaseError } = await supabaseAdmin
      .from('collections')
      .update(dataToUpdate)
      .eq('id', collectionId)
      .select()
      .single();

    if (supabaseError) {
       if (supabaseError.code === '23505') { 
        return NextResponse.json({ error: 'A collection with this name, content type, and category might already exist (DB constraint).', details: supabaseError.details }, { status: 409 });
      }
      return NextResponse.json({ error: supabaseError.message || 'Failed to update collection.' }, { status: 500 });
    }
    if (!updatedCollection) {
      return NextResponse.json({ error: 'Collection not found or no changes made.' }, { status: 404 });
    }

    return NextResponse.json(updatedCollection, { status: 200 });

  } catch (error: any) {
    if (error.code?.startsWith('auth/')) {
      return NextResponse.json({ error: `Unauthorized: Firebase token verification failed - ${error.message}` }, { status: 401 });
    }
    console.error("API Route (Collections PATCH): Internal Server Error:", error);
    return NextResponse.json({ error: 'Internal server error.', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  const { collectionId } = params;

  if (!firebaseAdminApp || !supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized: Missing or invalid token.' }, { status: 401 });
  }
  const idToken = authHeader.split('Bearer ')[1];

  try {
    await firebaseAdminApp.auth().verifyIdToken(idToken);
    
    const { error: unlinkError } = await supabaseAdmin
      .from('resources')
      .update({ collection_id: null })
      .eq('collection_id', collectionId);

    if (unlinkError) {
      console.error('API Route (Collections DELETE): Supabase error unlinking resources:', unlinkError);
    }

    const { error: deleteError, count } = await supabaseAdmin
      .from('collections')
      .delete({ count: 'exact' }) 
      .eq('id', collectionId);

    if (deleteError) {
      return NextResponse.json({ error: `Failed to delete collection: ${deleteError.message}` }, { status: 500 });
    }
    if (count === 0) {
        return NextResponse.json({ error: 'Collection not found for deletion.' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Collection deleted successfully' }, { status: 200 });

  } catch (error: any) {
    if (error.code?.startsWith('auth/')) {
      return NextResponse.json({ error: `Unauthorized: Firebase token verification failed - ${error.message}` }, { status: 401 });
    }
    console.error("API Route (Collections DELETE): Internal Server Error:", error);
    return NextResponse.json({ error: 'Internal server error.', details: error.message }, { status: 500 });
  }
}
