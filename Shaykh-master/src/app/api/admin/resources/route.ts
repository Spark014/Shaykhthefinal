
// src/app/api/admin/resources/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import { z } from 'zod';

// --- Supabase Admin Client Initialization ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('API Route (Resources POST): CRITICAL - NEXT_PUBLIC_SUPABASE_URL is not defined.');
}
if (!supabaseServiceRoleKey) {
  console.error('API Route (Resources POST): CRITICAL - SUPABASE_SERVICE_ROLE_KEY is not defined.');
}

const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey 
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

// --- Firebase Admin SDK Initialization ---
const firebaseAdminSdkConfigString = process.env.FIREBASE_ADMIN_SDK_CONFIG;
let firebaseAdminApp: admin.app.App;

function initializeFirebaseAdmin() {
  const appName = 'adminApiResourcesPost'; // Unique name
  if (admin.apps.some(app => app?.name === appName)) {
    firebaseAdminApp = admin.app(appName);
    return;
  }
  if (firebaseAdminSdkConfigString) {
    try {
      let serviceAccount: ServiceAccount;
      // Attempt to parse as JSON object first (common for .env strings)
      if (firebaseAdminSdkConfigString.startsWith('{')) {
        serviceAccount = JSON.parse(firebaseAdminSdkConfigString) as ServiceAccount;
      } else {
        // Fallback for path (less common for .env but included for completeness)
        console.warn(`API Route (${appName}): FIREBASE_ADMIN_SDK_CONFIG does not look like a JSON object. Attempting to use as path.`);
        serviceAccount = require(firebaseAdminSdkConfigString);
      }
      firebaseAdminApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }, appName);
    } catch (e: any) {
      console.error(`API Route (${appName}): CRITICAL - Firebase Admin SDK initialization error:`, e.message);
      console.error(`API Route (${appName}): Ensure FIREBASE_ADMIN_SDK_CONFIG in .env.local is a valid JSON string or path.`);
    }
  } else {
    console.error(`API Route (${appName}): CRITICAL - FIREBASE_ADMIN_SDK_CONFIG missing in .env.local.`);
  }
}

initializeFirebaseAdmin();

// --- Zod Schema for Resource Creation ---
const CreateResourceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  url: z.string().url("Invalid URL format"),
  type: z.string().min(1, "Resource type is required"),
  language: z.string().min(1, "Language is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional().nullable(),
  cover_image_url: z.string().url("Invalid cover image URL").optional().nullable().or(z.literal("")),
  tags: z.array(z.string()).optional().nullable(),
  collection_id: z.string().uuid("Invalid collection ID format").optional().nullable(),
});

// --- POST Handler for Creating Resources ---
export async function POST(request: NextRequest) {
  console.log("API Route (Resources POST): Received request.");

  if (!firebaseAdminApp) {
    console.error('API Route (Resources POST): Firebase Admin SDK not initialized.');
    return NextResponse.json({ error: 'Server configuration error (Firebase Admin).' }, { status: 500 });
  }
  if (!supabaseAdmin) {
    console.error('API Route (Resources POST): Supabase Admin Client not initialized.');
    return NextResponse.json({ error: 'Server configuration error (Supabase Admin).' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('API Route (Resources POST): Unauthorized - Missing or invalid Bearer token.');
    return NextResponse.json({ error: 'Unauthorized: Missing or invalid token.' }, { status: 401 });
  }
  const idToken = authHeader.split('Bearer ')[1];

  try {
    console.log("API Route (Resources POST): Verifying Firebase ID token...");
    const decodedToken = await firebaseAdminApp.auth().verifyIdToken(idToken);
    console.log(`API Route (Resources POST): Token verified for UID: ${decodedToken.uid}`);

    const rawBody = await request.json();
    const parseResult = CreateResourceSchema.safeParse(rawBody);

    if (!parseResult.success) {
      console.warn("API Route (Resources POST): Invalid request payload:", parseResult.error.flatten());
      return NextResponse.json({ error: "Invalid request payload.", issues: parseResult.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const resourceData = parseResult.data;

    // Check for existing resource with the same URL (if you want to enforce URL uniqueness)
    const { data: existingByUrl, error: urlCheckError } = await supabaseAdmin
        .from('resources')
        .select('id')
        .eq('url', resourceData.url)
        .maybeSingle();

    if (urlCheckError) {
        console.error('API Route (Resources POST): Supabase error checking for existing URL:', urlCheckError);
        // Decide if this is critical or if we proceed
    }
    if (existingByUrl) {
        console.warn(`API Route (Resources POST): Resource with URL "${resourceData.url}" already exists (ID: ${existingByUrl.id}).`);
        return NextResponse.json({ error: 'A resource with this URL already exists.' }, { status: 409 });
    }

    const dataToInsert = {
        ...resourceData,
        cover_image_url: resourceData.cover_image_url === "" ? null : resourceData.cover_image_url,
        tags: resourceData.tags && resourceData.tags.length > 0 ? resourceData.tags : null,
        collection_id: resourceData.collection_id || null, // Ensure null if empty/undefined
    };

    console.log("API Route (Resources POST): Inserting resource into Supabase with data:", dataToInsert);
    const { data: newResource, error: supabaseError } = await supabaseAdmin
      .from('resources')
      .insert([dataToInsert])
      .select()
      .single();

    if (supabaseError) {
      console.error('API Route (Resources POST): Supabase insert error:', supabaseError);
      if (supabaseError.code === '23505') { // Unique constraint violation (e.g. if URL is unique)
        return NextResponse.json({ error: 'A resource with this URL already exists.', details: supabaseError.details }, { status: 409 });
      }
      return NextResponse.json({ error: supabaseError.message || 'Failed to create resource.', details: supabaseError.details }, { status: 500 });
    }

    console.log("API Route (Resources POST): Resource created successfully:", newResource);
    return NextResponse.json(newResource, { status: 201 });

  } catch (error: any) {
    console.error('API Route (Resources POST): General error in POST handler:', error);
    if (error.code && error.code.startsWith('auth/')) {
      return NextResponse.json({ error: `Unauthorized: Firebase token verification failed - ${error.message}` }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error processing request.', details: error.message }, { status: 500 });
  }
}
