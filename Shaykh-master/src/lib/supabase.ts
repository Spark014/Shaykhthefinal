
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// --- Client-side Supabase Instance ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
let clientInitializationError: string | null = null;

const placeholderValues = [
  "YOUR_SUPABASE_URL",
  "YOUR_SUPABASE_ANON_KEY",
  "YOUR_SUPABASE_SERVICE_ROLE_KEY"
];

if (!supabaseUrl || placeholderValues.includes(supabaseUrl) || supabaseUrl.trim() === "") {
  const message = 'CRITICAL WARNING: NEXT_PUBLIC_SUPABASE_URL is not defined, is a placeholder, or is empty in .env.local. Client-side Supabase functionality will be unavailable.';
  console.warn(message);
  clientInitializationError = message;
} else if (!supabaseAnonKey || placeholderValues.includes(supabaseAnonKey) || supabaseAnonKey.trim() === "") {
  const message = 'CRITICAL WARNING: NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined, is a placeholder, or is empty in .env.local. Client-side Supabase functionality will be unavailable.';
  console.warn(message);
  clientInitializationError = message;
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error: any) {
    const message = `Error initializing client-side Supabase client: ${error.message}`;
    console.error(message);
    clientInitializationError = message;
    supabase = null;
  }
}

// --- Server-side Supabase Admin Instance ---
let supabaseAdmin: SupabaseClient | null = null;
let adminInitializationError: string | null = null;

// This code block will only be effectively processed on the server-side.
// Environment variables without NEXT_PUBLIC_ prefix are not available on the client.
if (typeof window === 'undefined') {
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || placeholderValues.includes(supabaseUrl) || supabaseUrl.trim() === "") {
    // This error would likely already be caught by client-side check if shared, but good for server-only context
    const message = 'CRITICAL ERROR: NEXT_PUBLIC_SUPABASE_URL is not defined for server-side admin client. Please check .env.local.';
    console.error(message);
    adminInitializationError = message;
  } else if (!supabaseServiceRoleKey || placeholderValues.includes(supabaseServiceRoleKey) || supabaseServiceRoleKey.trim() === "") {
    const message = 'CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY is not defined, is a placeholder, or is empty. Server-side Supabase admin client cannot be initialized. Please check your .env.local file.';
    console.error(message);
    if (!adminInitializationError) adminInitializationError = message;
  } else {
    try {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          // autoRefreshToken: false, // Not strictly needed if not using Supabase Auth methods
          // persistSession: false, // Not strictly needed if not using Supabase Auth methods
          // detectSessionInUrl: false // Not strictly needed for admin client
        }
      });
    } catch (error: any) {
      const message = `Error initializing server-side Supabase admin client: ${error.message}`;
      console.error(message);
      adminInitializationError = message;
      supabaseAdmin = null;
    }
  }
}

export { supabase, clientInitializationError, supabaseAdmin, adminInitializationError };
