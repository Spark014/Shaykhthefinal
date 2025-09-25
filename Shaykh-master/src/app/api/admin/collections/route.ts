
// src/app/api/admin/collections/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import { z } from 'zod';

// --- Supabase Admin Client Initialization ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('API Route (Collections POST): CRITICAL - NEXT_PUBLIC_SUPABASE_URL is not defined.');
}
if (!supabaseServiceRoleKey) {
  console.error('API Route (Collections POST): CRITICAL - SUPABASE_SERVICE_ROLE_KEY is not defined.');
}

const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey 
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

// --- Firebase Admin SDK Initialization ---
const firebaseAdminSdkConfigString = process.env.FIREBASE_ADMIN_SDK_CONFIG;
let firebaseAdminApp: admin.app.App;

function initializeFirebaseAdmin() {
  const appName = 'adminApiCollections';
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
      console.error(`API Route (${appName}): Ensure FIREBASE_ADMIN_SDK_CONFIG in .env.local is a valid JSON string.`);
    }
  } else {
    console.error(`API Route (${appName}): CRITICAL - FIREBASE_ADMIN_SDK_CONFIG missing in .env.local.`);
  }
}

initializeFirebaseAdmin();

// --- Zod Schema for Request Body Validation ---
const CreateCollectionSchema = z.object({
  name: z.string().min(1, { message: "Collection name is required." }),
  description: z.string().optional().nullable(),
  cover_image_url: z.string().url({ message: "Invalid cover image URL." }).optional().nullable().or(z.literal("")),
  language: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  collection_content_type: z.enum(['book', 'audio', 'video']).nullable(),
});

// --- POST Handler for Creating Collections ---
export async function POST(request: NextRequest) {
  if (!firebaseAdminApp) {
    console.error('API Route (Collections POST): Firebase Admin SDK not initialized.');
    return NextResponse.json({ error: 'Server configuration error (Firebase Admin).' }, { status: 500 });
  }
  if (!supabaseAdmin) {
    console.error('API Route (Collections POST): Supabase Admin Client not initialized (URL or Service Key missing).');
    return NextResponse.json({ error: 'Server configuration error (Supabase Admin).' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('API Route (Collections POST): Unauthorized - Missing or invalid Bearer token.');
    return NextResponse.json({ error: 'Unauthorized: Missing or invalid token.' }, { status: 401 });
  }
  const idToken = authHeader.split('Bearer ')[1];

  try {
    await firebaseAdminApp.auth().verifyIdToken(idToken);

    const rawBody = await request.json();
    const parseResult = CreateCollectionSchema.safeParse(rawBody);

    if (!parseResult.success) {
      console.warn("API Route (Collections POST): Invalid request payload:", parseResult.error.flatten());
      return NextResponse.json({ error: "Invalid request payload.", issues: parseResult.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const collectionData = parseResult.data;

    // Proactive check for duplicate collection based on name, collection_content_type, and category
    const { data: potentialDuplicates, error: checkError } = await supabaseAdmin
      .from('collections')
      .select('id, name, collection_content_type, category')
      .eq('name', collectionData.name)
      .eq('collection_content_type', collectionData.collection_content_type)
      .eq('category', collectionData.category);


    if (checkError) {
      console.error('API Route (Collections POST): Supabase error checking for existing collection:', checkError);
      return NextResponse.json({ error: 'Failed to verify collection uniqueness due to a database error.' }, { status: 500 });
    }

    if (potentialDuplicates && potentialDuplicates.length > 0) {
        console.warn(`API Route (Collections POST): Duplicate collection found (name, type, category match): Name="${collectionData.name}", Type="${collectionData.collection_content_type}", Category="${collectionData.category}".`);
        return NextResponse.json({ error: 'A collection with this name, content type, and category already exists.' }, { status: 409 });
    }
    
    const dataToInsert = {
        name: collectionData.name,
        description: collectionData.description || null,
        cover_image_url: collectionData.cover_image_url === "" ? null : collectionData.cover_image_url,
        language: collectionData.language || null,
        category: collectionData.category || null,
        collection_content_type: collectionData.collection_content_type,
    };

    const { data: newCollection, error: supabaseError } = await supabaseAdmin
      .from('collections')
      .insert([dataToInsert])
      .select()
      .single(); 

    if (supabaseError) {
      console.error('API Route (Collections POST): Supabase insert error:', supabaseError);
      if (supabaseError.code === '23505') { 
        return NextResponse.json({ error: 'A collection with this name, content type, and category already exists (DB constraint).', details: supabaseError.details }, { status: 409 });
      }
      return NextResponse.json({ error: supabaseError.message || 'Failed to create collection.', details: supabaseError.details }, { status: 500 });
    }

    return NextResponse.json(newCollection, { status: 201 });

  } catch (error: any) {
    console.error('API Route (Collections POST): General error in POST handler:', error);
    if (error.code && error.code.startsWith('auth/')) {
      return NextResponse.json({ error: `Unauthorized: Firebase token verification failed - ${error.message}` }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error processing request.', details: error.message }, { status: 500 });
  }
}
