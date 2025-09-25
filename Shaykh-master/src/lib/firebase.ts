
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// These are intended to be NEXT_PUBLIC_ but read from process.env for server-side and client-side consistency
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID; // Optional

let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;
let db: Firestore | undefined = undefined; // Added db variable
let firebaseInitializationError: string | null = null;
let isFirebaseConfigValid = true;

const placeholderValues = [ // Common placeholder values to check against
  "YOUR_FIREBASE_API_KEY", "YOUR_API_KEY", // Variations for API_KEY
  "YOUR_FIREBASE_AUTH_DOMAIN", "YOUR_AUTH_DOMAIN",
  "YOUR_FIREBASE_PROJECT_ID", "YOUR_PROJECT_ID",
  "YOUR_FIREBASE_MESSAGING_SENDER_ID", "YOUR_MESSAGING_SENDER_ID",
  "YOUR_FIREBASE_APP_ID", "YOUR_APP_ID",
  "YOUR_FIREBASE_MEASUREMENT_ID", "YOUR_MEASUREMENT_ID",
];

const createConfigErrorMessage = (varName: string) =>
  `CRITICAL ERROR: Firebase configuration variable ${varName} is not defined, is a placeholder, or is empty. Please check your .env.local file. Firebase functionality will be severely impaired or non-functional.`;

if (!apiKey || placeholderValues.includes(apiKey) || (apiKey && apiKey.trim() === "")) {
  firebaseInitializationError = createConfigErrorMessage('NEXT_PUBLIC_FIREBASE_API_KEY');
  isFirebaseConfigValid = false;
} else if (!projectId || placeholderValues.includes(projectId) || (projectId && projectId.trim() === "")) {
  firebaseInitializationError = createConfigErrorMessage('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  isFirebaseConfigValid = false;
}
// Add more checks for other essential public vars if needed, e.g., authDomain

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: authDomain || (projectId && isFirebaseConfigValid ? `${projectId}.firebaseapp.com` : undefined),
  projectId: projectId,
  // storageBucket: projectId && isFirebaseConfigValid ? `${projectId}.appspot.com` : undefined, // Only if using Firebase Storage
  messagingSenderId: messagingSenderId,
  appId: appId,
  measurementId: measurementId, // Optional
};

if (isFirebaseConfigValid) {
  if (getApps().length === 0) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (error: any) {
      firebaseInitializationError = `CRITICAL ERROR: Firebase client SDK initialization failed: ${(error as Error).message}. This often happens if your .env.local Firebase configuration is incorrect or incomplete.`;
      isFirebaseConfigValid = false; 
    }
  } else {
    app = getApps()[0]!;
  }

  if (app && isFirebaseConfigValid) { 
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    if (!firebaseInitializationError) { // If initialization failed silently for some reason
      firebaseInitializationError = "Firebase app object is not available after attempting initialization. Firebase Auth and Firestore services may not be initialized correctly.";
    }
    console.error(firebaseInitializationError);
    isFirebaseConfigValid = false; 
  }
}

if (!isFirebaseConfigValid && firebaseInitializationError) {
  // Log the error only once, either here or in checkEnvironmentVariables
  // console.error(firebaseInitializationError); // Moved to env-checker or will log per usage
}


export { app, auth, db, firebaseInitializationError, isFirebaseConfigValid };
