"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { auth, firebaseInitializationError as firebaseInitErrorFromLib, isFirebaseConfigValid as isFbConfigValidFromLib } from '../lib/firebase';
import { supabase, clientInitializationError as supabaseInitErrorFromLib } from '../lib/supabase';
import type { User as FirebaseUser, AuthError as FirebaseAuthError } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js';
// Update the import path if the file exists elsewhere, e.g.:
import { useToast } from '../hooks/use-toast';
// Or create the file at src/hooks/use-toast.tsx if it does not exist.

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  firebaseError: string | null; // Consolidate Firebase init and auth errors
  supabaseError: string | null; // Consolidate Supabase init and session errors
  isFirebaseConfigValid: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState<string | null>(firebaseInitErrorFromLib);
  const [supabaseError, setSupabaseError] = useState<string | null>(supabaseInitErrorFromLib);
  const [isFirebaseConfigValid, setIsFirebaseConfigValid] = useState<boolean>(isFbConfigValidFromLib);
  const { toast } = useToast();

  useEffect(() => {
    if (!isFbConfigValidFromLib) {
      console.error("AuthProvider: Firebase configuration is invalid. Auth context will not function correctly.");
      setFirebaseError(firebaseInitErrorFromLib || "Firebase configuration invalid, AuthProvider cannot initialize.");
      setLoading(false);
      return;
    }
    if (!auth) {
      console.error("AuthProvider: Firebase Auth instance is not available. This indicates a critical issue with Firebase initialization in @/lib/firebase.ts.");
      setFirebaseError("Firebase Auth instance missing in AuthProvider.");
      setLoading(false);
      return;
    }
     if (!supabase) {
      console.warn("AuthProvider: Supabase client is not available. Supabase session synchronization will be skipped. Check @/lib/supabase.ts.");
      setSupabaseError(supabaseInitErrorFromLib || "Supabase client missing, session sync disabled.");
      // Continue with Firebase auth, but Supabase sync will be off
    }


    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setFirebaseError(null); // Clear previous auth-specific errors
      // setSupabaseError(null); // Clear previous Supabase session errors

      if (firebaseUser) {
        setUser(firebaseUser);
        console.log("[AuthContext] Firebase user detected:", firebaseUser.uid);
        // Only attempt Supabase session if explicitly required
        if (supabase && supabase.auth && process.env.NEXT_PUBLIC_SUPABASE_SESSION_SYNC === "true") {
          try {
            console.log("[AuthContext] Attempting to get Firebase ID token...");
            const token = await firebaseUser.getIdToken();
            if (token && typeof token === 'string' && token.trim() !== '') {
              console.log("[AuthContext] Firebase ID token obtained (first 20 chars):", token.substring(0, 20) + "...");
              const sessionToSet = { access_token: token, refresh_token: "" };
              console.log("[AuthContext] Object to be passed to supabase.auth.setSession:", JSON.stringify(sessionToSet).substring(0,100) + "...");
              const { data: sessionData, error: supaAuthError } = await supabase.auth.setSession(sessionToSet);

              if (supaAuthError) {
                console.error("[AuthContext] Error setting Supabase session with Firebase token:", supaAuthError);
                setSupabaseError(`Supabase session error: ${supaAuthError.message} (Code: ${supaAuthError.status})`);
                // Only log the error, do not show a toast/alert to the user
              } else {
                console.log("[AuthContext] Supabase session successfully set/updated. Session user aud:", sessionData?.session?.user?.aud);
                setSupabaseError(null);
              }
            } else {
              console.error("[AuthContext] Firebase user exists, but getIdToken() returned an invalid token:", token);
              setFirebaseError("Failed to get a valid Firebase ID token for Supabase sync.");
              await supabase.auth.signOut().catch(e => console.error("[AuthContext] Supabase signout error after invalid Firebase token:", e));
            }
          } catch (idTokenError: any) {
            console.error("[AuthContext] Error during Firebase getIdToken() or Supabase session setting:", idTokenError);
            setFirebaseError(`Firebase token/Supabase session error: ${idTokenError.message}`);
            if (supabase && supabase.auth) {
                await supabase.auth.signOut().catch(e => console.error("[AuthContext] Supabase signout error after exception:", e));
            }
          }
        } else {
            if (process.env.NEXT_PUBLIC_SUPABASE_SESSION_SYNC === "true") {
              console.warn("[AuthContext] Supabase client or supabase.auth is not available. Skipping Supabase session sync.");
              if (!supabaseError) setSupabaseError("Supabase client not available for session sync.");
            }
        }
      } else {
        setUser(null);
        console.log("[AuthContext] No Firebase user detected.");
        if (supabase && supabase.auth) {
          console.log("[AuthContext] Clearing Supabase session as Firebase user is not present.");
          const { error: supaSignOutError } = await supabase.auth.signOut();
          if (supaSignOutError) {
            console.error("[AuthContext] Error signing out Supabase session:", supaSignOutError);
            setSupabaseError(`Supabase sign-out error: ${supaSignOutError.message}`);
          } else {
             console.log("[AuthContext] Supabase session cleared.");
             setSupabaseError(null);
          }
        }
      }
      setLoading(false);
    }, (error) => {
        console.error("[AuthContext] Firebase onAuthStateChanged error:", error);
        setFirebaseError(`Firebase auth state error: ${error.message}${(error as any)?.code ? ` (Code: ${(error as any).code})` : ''}`);
        setUser(null);
        setLoading(false);
        if (supabase && supabase.auth) {
             supabase.auth.signOut().catch(e => console.error("Supabase signout error after Firebase auth error:", e));
        }
    });

    return () => unsubscribe();
  }, [isFbConfigValidFromLib, toast]); // Added toast to dependency array

  const handleSignOut = useCallback(async () => {
    setLoading(true);
    try {
      if (!auth) {
        throw new Error("Firebase Auth instance not available for sign out.");
      }
      await firebaseSignOut(auth);
      // setUser(null); // onAuthStateChanged will handle this and Supabase signout
      console.log("[AuthContext] Firebase sign-out successful.");
      // Supabase sign out is handled by onAuthStateChanged
    } catch (error: any) {
      console.error("[AuthContext] Error signing out from Firebase:", error);
      setFirebaseError(`Sign out error: ${error.message}`);
      toast({
        title: "Sign Out Error",
        description: `Failed to sign out: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      // setLoading(false); // onAuthStateChanged will set loading
    }
  }, [toast]); // Added toast to dependency array

  return (
    <AuthContext.Provider value={{ user, loading, signOut: handleSignOut, firebaseError, supabaseError, isFirebaseConfigValid }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
