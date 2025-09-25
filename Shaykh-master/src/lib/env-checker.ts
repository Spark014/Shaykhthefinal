// src/lib/env-checker.ts

/**
 * Checks for the presence of required environment variables.
 * Throws an error if any required variable is missing.
 * Call this function at the beginning of server-side modules or in next.config.js
 * if you want to fail the build/startup on missing variables.
 */
export function checkEnvironmentVariables(): void {
  const requiredServerVars: string[] = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'FIREBASE_ADMIN_SDK_CONFIG',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM_EMAIL',
    // Add SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT if Sentry is used for source maps
  ];

  const requiredPublicVars: string[] = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    // Add NEXT_PUBLIC_SENTRY_DSN if Sentry is used
  ];

  const missingServerVars = requiredServerVars.filter(v => !process.env[v]);
  const missingPublicVars = requiredPublicVars.filter(v => !process.env[v]);

  const missingVars = [...missingServerVars, ...missingPublicVars];

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. Please check your .env.local file or hosting provider configuration.`
    );
  }

  // Validate JSON structure for FIREBASE_ADMIN_SDK_CONFIG
  if (process.env.FIREBASE_ADMIN_SDK_CONFIG) {
    try {
      JSON.parse(process.env.FIREBASE_ADMIN_SDK_CONFIG);
    } catch (e) {
      throw new Error(
        'FIREBASE_ADMIN_SDK_CONFIG is not valid JSON. Please ensure it is correctly formatted.'
      );
    }
  }
  
  console.log("Environment variables checked successfully.");
}

// Example: If you want to run this check when this module is imported (e.g., by next.config.js)
// if (typeof window === 'undefined') { // Ensure it runs only on the server
//   checkEnvironmentVariables();
// }
