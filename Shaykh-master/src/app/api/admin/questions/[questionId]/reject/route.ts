

// src/app/api/admin/questions/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const firebaseAdminSdkConfigString = process.env.FIREBASE_ADMIN_SDK_CONFIG;

let firebaseAdminApp: admin.app.App;

function initializeFirebaseAdmin() {
  const appName = 'adminAppQuestionsApi'; // Unique name for this app instance

  if (admin.apps.some(app => app?.name === appName)) {
    firebaseAdminApp = admin.app(appName);
    console.log(`API Route: Using existing Firebase Admin SDK instance named "${appName}".`);
    return;
  }

  if (firebaseAdminSdkConfigString) {
    try {
      const serviceAccount = JSON.parse(firebaseAdminSdkConfigString) as ServiceAccount;
      firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      }, appName);
      console.log(`API Route: Firebase Admin SDK initialized successfully with name "${appName}".`);
    } catch (e: any) {
      console.error('API Route: CRITICAL - Failed to parse FIREBASE_ADMIN_SDK_CONFIG or initialize Firebase Admin SDK:', e.message);
      console.error('API Route: Full error stack for Firebase Admin SDK init:', e.stack);
      console.error('API Route: Ensure FIREBASE_ADMIN_SDK_CONFIG in .env.local is a valid JSON string enclosed in single quotes.');
      // firebaseAdminApp will remain undefined, GET handler will catch this
    }
  } else {
    console.error('API Route: CRITICAL - FIREBASE_ADMIN_SDK_CONFIG is missing in .env.local. Firebase Admin SDK cannot be initialized.');
    // firebaseAdminApp will remain undefined
  }
}

initializeFirebaseAdmin(); // Initialize on module load

export async function GET(request: NextRequest) {
  console.log("API Route: GET /api/admin/questions request received.");

  if (!supabaseUrl) {
    console.error('API Route: CRITICAL - NEXT_PUBLIC_SUPABASE_URL is not defined in .env.local.');
    return NextResponse.json({ error: 'Server configuration error: Supabase URL missing.' }, { status: 500 });
  }
  if (!supabaseServiceRoleKey) {
    console.error('API Route: CRITICAL - SUPABASE_SERVICE_ROLE_KEY is not defined in .env.local.');
    return NextResponse.json({ error: 'Server configuration error: Supabase Service Role Key missing.' }, { status: 500 });
  }
  if (!firebaseAdminApp) {
    console.error('API Route: CRITICAL - Firebase Admin SDK is not initialized. This usually means FIREBASE_ADMIN_SDK_CONFIG is missing or invalid in .env.local.');
    return NextResponse.json({ error: 'Server configuration error: Firebase Admin SDK not initialized. Check server logs for details.' }, { status: 500 });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    console.log("API Route: Supabase admin client created.");
  } catch (e: any) {
    console.error('API Route: CRITICAL - Failed to create Supabase admin client:', e.message, e.stack);
    return NextResponse.json({ error: 'Server configuration error: Failed to create Supabase client.' }, { status: 500 });
  }
  
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('API Route: Unauthorized - Missing or invalid Authorization Bearer token in request header.');
    return NextResponse.json({ error: 'Unauthorized: Missing or invalid token.' }, { status: 401 });
  }
  const idToken = authHeader.split('Bearer ')[1];
  console.log("API Route: Firebase ID token received from Authorization header.");

  try {
    console.log("API Route: Attempting to verify Firebase ID token...");
    const decodedToken = await firebaseAdminApp.auth().verifyIdToken(idToken);
    console.log(`API Route: Firebase ID token verified successfully for UID: ${decodedToken.uid}, Email: ${decodedToken.email}`);

    const statusFilter = request.nextUrl.searchParams.get('status');
    let query = supabaseAdmin
      .from('questions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
      console.log(`API Route: Applying status filter to query: status = '${statusFilter}'`);
    } else {
      console.log("API Route: No status filter applied or 'all' selected for query.");
    }

    console.log("API Route: Executing Supabase query to fetch questions...");
    const { data, error: supabaseQueryError } = await query;

    if (supabaseQueryError) {
      console.error('API Route: Supabase query error while fetching questions:', supabaseQueryError);
      return NextResponse.json({ error: supabaseQueryError.message || 'Failed to fetch questions from database.' }, { status: 500 });
    }

    console.log(`API Route: Successfully fetched ${data?.length || 0} questions from Supabase.`);
    return NextResponse.json(data || []);

  } catch (error: any) {
    console.error('API Route: General error during token verification or Supabase query execution:', error);
    if (error.code && error.code.startsWith('auth/')) {
        console.error(`API Route: Firebase token verification explicitly failed - Code: ${error.code}, Message: ${error.message}`);
        return NextResponse.json({ error: `Unauthorized: Firebase token verification failed - ${error.message}` }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error processing request.', details: error.message || 'Unknown error occurred in API route.' }, { status: 500 });
  }
}
