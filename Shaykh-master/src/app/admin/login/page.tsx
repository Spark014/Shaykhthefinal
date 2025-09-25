
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn, Mail, KeyRound, ShieldCheck } from "lucide-react";
import { signInWithEmailAndPassword, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useLanguage } from "@/context/LanguageContext";
import Image from "next/image";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const { currentLanguage } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (auth) {
      unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setAuthLoading(false);
      });
    } else {
      setCurrentUser(null);
      setAuthLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authLoading && currentUser) {
      router.replace("/admin/dashboard");
    }
  }, [currentUser, authLoading, router]);

  const T = useMemo(() => ({
    en: {
      title: "Admin Login",
      description: "Access the scholarly portal's control panel.",
      emailLabel: "Email",
      passwordLabel: "Password",
      loginButton: "Login",
      loggingInButton: "Logging in...",
      loginSuccessTitle: "Login Successful",
      loginSuccessDesc: "Redirecting to dashboard...",
      loginErrorTitle: "Login Failed",
      loginErrorDescInvalid: "Invalid email or password. Please try again.",
      loginErrorDescGeneral: "An error occurred. Please try again later.",
    },
    ar: {
      title: "تسجيل دخول المسؤول",
      description: "الوصول إلى لوحة تحكم البوابة العلمية.",
      emailLabel: "البريد الإلكتروني",
      passwordLabel: "كلمة المرور",
      loginButton: "تسجيل الدخول",
      loggingInButton: "جارٍ تسجيل الدخول...",
      loginSuccessTitle: "تم تسجيل الدخول بنجاح",
      loginSuccessDesc: "جارٍ التحويل إلى لوحة التحكم...",
      loginErrorTitle: "فشل تسجيل الدخول",
      loginErrorDescInvalid: "بريد إلكتروني أو كلمة مرور غير صالحة. يرجى المحاولة مرة أخرى.",
      loginErrorDescGeneral: "حدث خطأ. يرجى المحاولة مرة أخرى لاحقًا.",
    }
  }[currentLanguage]), [currentLanguage]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!auth) {
        throw new Error("Firebase Auth is not initialized.");
      }
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: T.loginSuccessTitle,
        description: T.loginSuccessDesc,
      });
      // Redirection is handled by useEffect
    } catch (error: any) {
      let description = T.loginErrorDescGeneral;
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        description = T.loginErrorDescInvalid;
      }
      toast({
        title: T.loginErrorTitle,
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || (!authLoading && currentUser)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <Card className="w-full max-w-md shadow-2xl overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground p-6 text-center">
           <Image src="/logo.png" alt="Portal Logo" width={64} height={64} className="mx-auto mb-4 rounded-full bg-white p-1" />
          <CardTitle className="text-3xl font-bold font-headline">{T.title}</CardTitle>
          <CardDescription className="text-primary-foreground/80">{T.description}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{T.emailLabel}</Label>
              <div className="relative">
                <Mail className={`absolute ${currentLanguage === 'ar' ? 'right-3' : 'left-3'} top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground`} />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`${currentLanguage === 'ar' ? 'pr-10' : 'pl-10'}`}
                  dir="ltr"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{T.passwordLabel}</Label>
               <div className="relative">
                <KeyRound className={`absolute ${currentLanguage === 'ar' ? 'right-3' : 'left-3'} top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground`} />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`${currentLanguage === 'ar' ? 'pr-10' : 'pl-10'}`}
                  dir="ltr"
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-lg py-3" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-5 w-5 animate-spin`} />
                  {T.loggingInButton}
                </>
              ) : (
                <>
                 <LogIn className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-5 w-5`} />
                 {T.loginButton}
                </>
              )}
            </Button>
          </form>
        </CardContent>
         <CardFooter className="p-4 bg-muted/50 border-t text-center">
            <p className="text-xs text-muted-foreground">
                <ShieldCheck className="inline h-3 w-3 mr-1 rtl:mr-0 rtl:ml-1 align-middle"/> 
                {currentLanguage === 'ar' ? 'منطقة المسؤولين الآمنة' : 'Secure Administrator Area'}
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
