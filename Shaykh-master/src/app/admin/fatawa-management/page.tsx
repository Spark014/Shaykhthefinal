
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page is for redirecting from the old Fatawa management path
// to the new Questions management path.
export default function OldFatawaManagementPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Perform a client-side redirect to the new page.
    // Using replace so the old URL isn't in the browser history.
    router.replace('/admin/questions-management');
  }, [router]);

  // Display a loading/redirecting message while the redirect happens.
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4" dir="ltr">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg text-muted-foreground">
        This page has been moved. Redirecting to Questions Management...
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        (الرجاء الانتظار، يتم تحويلك الآن إلى صفحة إدارة الأسئلة...)
      </p>
    </div>
  );
}
