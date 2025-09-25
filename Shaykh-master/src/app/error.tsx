// src/app/error.tsx
"use client"; // Error components must be Client Components
import React from 'react';
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useLanguage } from "@/context/LanguageContext";
// import * as Sentry from "@sentry/nextjs"; // Uncomment if Sentry is configured

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { currentLanguage } = useLanguage();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error("GlobalError caught:", error);
    // Sentry.captureException(error); // Uncomment if Sentry is configured
  }, [error]);
  
  const texts = {
    en: {
      title: "Something Went Wrong",
      message: "An unexpected error occurred. We've been notified and are looking into it.",
      messageWithDigest: `An unexpected error occurred (Digest: ${error.digest}). We've been notified.`,
      tryAgain: "Try Again",
      goHome: "Go to Homepage",
    },
    ar: {
      title: "حدث خطأ ما",
      message: "حدث خطأ غير متوقع. لقد تم إخطارنا ونحن نعمل على إصلاحه.",
      messageWithDigest: `حدث خطأ غير متوقع (الخلاصة: ${error.digest}). لقد تم إخطارنا.`,
      tryAgain: "حاول مرة أخرى",
      goHome: "الذهاب إلى الصفحة الرئيسية",
    }
  };

  const T = texts[currentLanguage];


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive font-headline">
            {T.title}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {error.digest ? T.messageWithDigest : T.message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Optionally display more error details for development */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 p-3 bg-muted rounded-md text-xs">
              <summary className="cursor-pointer font-medium">Error Details (Development)</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all">
                {error.stack || error.message}
              </pre>
            </details>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
          <Button onClick={() => reset()} className="w-full sm:w-auto">
            <RefreshCcw className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} />
            {T.tryAgain}
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <a href="/">{T.goHome}</a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
