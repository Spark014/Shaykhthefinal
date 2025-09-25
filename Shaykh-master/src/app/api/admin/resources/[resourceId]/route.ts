
// src/app/api/admin/resources/[resourceId]/route.ts
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
  const appName = 'adminApiResourcesModify'; 
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

const UpdateResourceSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  url: z.string().url("Invalid URL format").optional(),
  type: z.string().min(1, "Resource type is required").optional(),
  language: z.string().min(1, "Language is required").optional(),
  category: z.string().min(1, "Category is required").optional(),
  description: z.string().optional().nullable(),
  cover_image_url: z.string().url("Invalid cover image URL").optional().nullable().or(z.literal("")),
  tags: z.array(z.string()).optional().nullable(),
  collection_id: z.string().uuid("Invalid collection ID format").optional().nullable(),
});


export async function PATCH(
  request: NextRequest,
  { params }: { params: { resourceId: string } }
) {
  const { resourceId } = params;

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
    const parseResult = UpdateResourceSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid request payload.", issues: parseResult.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const resourceData = parseResult.data;
    
    if (resourceData.url) {
        const { data: existingByUrl, error: urlCheckError } = await supabaseAdmin
            .from('resources')
            .select('id')
            .eq('url', resourceData.url)
            .neq('id', resourceId) 
            .maybeSingle();

        if (urlCheckError) {
            console.error('API Route (Resources PATCH): Supabase error checking for existing URL:', urlCheckError);
        }
        if (existingByUrl) {
            return NextResponse.json({ error: 'A resource with this URL already exists.' }, { status: 409 });
        }
    }
    
    const dataToUpdate: Partial<typeof resourceData> = { ...resourceData };
    if (resourceData.cover_image_url === "") {
        dataToUpdate.cover_image_url = null;
    }
    if (resourceData.tags && resourceData.tags.length === 0) {
        dataToUpdate.tags = null;
    }
     if (resourceData.collection_id === "null_option" || resourceData.collection_id === "") { 
        dataToUpdate.collection_id = null;
    }

    const { data: updatedResource, error: supabaseError } = await supabaseAdmin
      .from('resources')
      .update(dataToUpdate)
      .eq('id', resourceId)
      .select()
      .single();

    if (supabaseError) {
      if (supabaseError.code === '23505') { 
        return NextResponse.json({ error: 'A resource with this URL already exists.', details: supabaseError.details }, { status: 409 });
      }
      return NextResponse.json({ error: supabaseError.message || 'Failed to update resource.' }, { status: 500 });
    }
    if (!updatedResource) {
      return NextResponse.json({ error: 'Resource not found or no changes made.' }, { status: 404 });
    }

    return NextResponse.json(updatedResource, { status: 200 });

  } catch (error: any) {
    if (error.code?.startsWith('auth/')) {
      return NextResponse.json({ error: `Unauthorized: Firebase token verification failed - ${error.message}` }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error.', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { resourceId: string } }
) {
  const { resourceId } = params;

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
    
    const { error: supabaseError, count } = await supabaseAdmin
      .from('resources')
      .delete({ count: 'exact' })
      .eq('id', resourceId);

    if (supabaseError) {
      return NextResponse.json({ error: supabaseError.message || 'Failed to delete resource.' }, { status: 500 });
    }
    if (count === 0) {
        return NextResponse.json({ error: 'Resource not found for deletion.' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Resource deleted successfully' }, { status: 200 });

  } catch (error: any) {
    if (error.code?.startsWith('auth/')) {
      return NextResponse.json({ error: `Unauthorized: Firebase token verification failed - ${error.message}` }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error.', details: error.message }, { status: 500 });
  }
}
