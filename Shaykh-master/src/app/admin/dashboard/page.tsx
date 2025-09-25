"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useState, useEffect, useMemo, useCallback } from "react";
import { LayoutDashboard, LogOut, Loader2, MessageSquareText, Users, Settings, Package, Library } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";

export default function AdminDashboardPage() {
  const { currentLanguage } = useLanguage();
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [resourceCounts, setResourceCounts] = useState({
    total: 0,
    collections: 0,
    questions: 0,
    loading: true
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/admin/login');
    }
  }, [authLoading, user, router]);

  const fetchCounts = useCallback(async () => {
    if (!user || !supabase) return;
    
    try {
      setResourceCounts(prev => ({ ...prev, loading: true }));
      
      const [resourcesResult, collectionsResult, questionsResult] = await Promise.all([
        supabase.from('resources').select('id', { count: 'exact', head: true }),
        supabase.from('collections').select('id', { count: 'exact', head: true }),
        supabase.from('questions').select('id').eq('status', 'pending')
      ]);

      console.log('Questions query result:', questionsResult); // Debug log

      setResourceCounts({
        total: resourcesResult.count || 0,
        collections: collectionsResult.count || 0,
        questions: Array.isArray(questionsResult.data) ? questionsResult.data.length : 0,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching counts:', error);
      setResourceCounts(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCounts();
    }
  }, [user, fetchCounts]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      // Redirection will be handled by the AuthContext effect or the useEffect above
    } catch (error) {
      console.error("Error signing out: ", error);
      // Optionally, show a toast message for logout error
    } finally {
      setIsLoggingOut(false);
    }
  };

  const T = useMemo(() => ({ // Wrapped in useMemo
    en: {
      title: "Admin Dashboard",
      description: "Manage scholarly resources, users, and site settings.",
      welcomeMessage: "Welcome to the Admin Dashboard.",
      resourceManagement: "Resource Management",
      resourceManagementDesc: "Manage all site resources (PDFs, audio, etc.).",
      resourceCount: (count: number) => `${count} resources`,
      collectionManagement: "Collection Management",
      collectionManagementDesc: "Organize resources into collections.",
      collectionCount: (count: number) => `${count} collections`,
      userManagement: "User Management",
      userManagementDesc: "Manage admin users and roles.",
      questionsManagement: "Questions Management",
      questionsManagementDesc: "Review and answer submitted questions.",
      questionCount: (count: number) => `${count} questions`,
      siteSettings: "Site Settings",
      siteSettingsDesc: "Configure general website settings.",
      logoutButton: "Logout",
      loggingOutButton: "Logging out...",
    },
    ar: {
      title: "لوحة تحكم المسؤول",
      description: "إدارة الموارد العلمية والمستخدمين وإعدادات الموقع.",
      welcomeMessage: "مرحباً بك في لوحة تحكم المسؤول.",
      resourceManagement: "إدارة الموارد",
      resourceManagementDesc: "إدارة جميع موارد الموقع (PDF، صوتيات، إلخ).",
      resourceCount: (count: number) => `${count} مورد`,
      collectionManagement: "إدارة المجموعات",
      collectionManagementDesc: "تنظيم الموارد في مجموعات.",
      collectionCount: (count: number) => `${count} مجموعة`,
      userManagement: "إدارة المستخدمين",
      userManagementDesc: "إدارة المستخدمين المسؤولين والأدوار.",
      questionsManagement: "إدارة الأسئلة",
      questionsManagementDesc: "مراجعة الأسئلة المرسلة والإجابة عليها.",
      questionCount: (count: number) => `${count} سؤال`,
      siteSettings: "إعدادات الموقع",
      siteSettingsDesc: "تكوين إعدادات الموقع العامة.",
      logoutButton: "تسجيل الخروج",
      loggingOutButton: "جارٍ تسجيل الخروج...",
    }
  }[currentLanguage]), [currentLanguage]);


  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If execution reaches here, user is authenticated and authLoading is false.
  return (
    <div className="container mx-auto py-8 space-y-8" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <header className="text-center">
        <div className="backdrop-blur-xl bg-white/15 dark:bg-black/10 border border-white/25 dark:border-white/10 rounded-2xl p-8 shadow-2xl mb-8">
          <LayoutDashboard className="mx-auto h-16 w-16 drop-shadow-lg mb-4" style={{color: 'hsl(40, 9%, 50%)'}} />
          <h1 className="text-4xl md:text-5xl font-bold drop-shadow-lg mb-2 font-headline" style={{color: 'hsl(40, 9%, 45%)'}}>
            {T.title}
          </h1>
          <p className="text-lg drop-shadow-md" style={{color: 'hsl(40, 9%, 55%)'}}>
            {T.description}
          </p>
        </div>
      </header>

      <Card className="backdrop-blur-xl bg-white/15 dark:bg-black/10 border border-white/25 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-white/20 via-white/10 to-white/20 dark:from-black/20 dark:via-black/10 dark:to-black/20 border-b border-white/25 dark:border-white/10">
          <CardTitle className="font-headline drop-shadow-lg" style={{color: 'hsl(40, 9%, 45%)'}}>{T.welcomeMessage}</CardTitle>
          <CardDescription className="drop-shadow-md" style={{color: 'hsl(40, 9%, 55%)'}}>Logged in as: {user.email}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          <Link href="/admin/resources" passHref>
            <Card className="backdrop-blur-lg bg-white/20 dark:bg-black/15 border border-white/30 dark:border-white/20 hover:bg-white/25 dark:hover:bg-black/20 transition-all duration-300 cursor-pointer rounded-xl shadow-xl hover:shadow-2xl hover:scale-105" style={{'--hover-border': 'hsl(40, 9%, 70%)'} as React.CSSProperties}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium drop-shadow-md" style={{color: 'hsl(40, 9%, 50%)'}}>{T.resourceManagement}</CardTitle>
                <Package className="h-5 w-5 drop-shadow-md" style={{color: 'hsl(40, 9%, 55%)'}} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 drop-shadow-lg mb-1">
                  {resourceCounts.loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-blue-700 dark:text-blue-400" />
                  ) : (
                    T.resourceCount(resourceCounts.total)
                  )}
                </div>
                <p className="text-xs drop-shadow-md" style={{color: 'hsl(40, 9%, 60%)'}}>{T.resourceManagementDesc}</p>
              </CardContent>
            </Card>
          </Link>
           <Link href="/admin/manage-collections" passHref>
            <Card className="backdrop-blur-lg bg-white/20 dark:bg-black/15 border border-white/30 dark:border-white/20 hover:bg-white/25 dark:hover:bg-black/20 transition-all duration-300 cursor-pointer rounded-xl shadow-xl hover:shadow-2xl hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium drop-shadow-md" style={{color: 'hsl(40, 9%, 50%)'}}>{T.collectionManagement}</CardTitle>
                <Library className="h-5 w-5 drop-shadow-md" style={{color: 'hsl(40, 9%, 55%)'}} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 drop-shadow-lg mb-1">
                  {resourceCounts.loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-blue-700 dark:text-blue-400" />
                  ) : (
                    T.collectionCount(resourceCounts.collections)
                  )}
                </div>
                <p className="text-xs drop-shadow-md" style={{color: 'hsl(40, 9%, 60%)'}}>{T.collectionManagementDesc}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/questions-management" passHref>
            <Card className="backdrop-blur-lg bg-white/20 dark:bg-black/15 border border-white/30 dark:border-white/20 hover:bg-white/25 dark:hover:bg-black/20 transition-all duration-300 cursor-pointer rounded-xl shadow-xl hover:shadow-2xl hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium drop-shadow-md" style={{color: 'hsl(40, 9%, 50%)'}}>{T.questionsManagement}</CardTitle>
                <MessageSquareText className="h-5 w-5 drop-shadow-md" style={{color: 'hsl(40, 9%, 55%)'}} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 drop-shadow-lg mb-1">
                  {resourceCounts.loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-blue-700 dark:text-blue-400" />
                  ) : (
                    T.questionCount(resourceCounts.questions)
                  )}
                </div>
                <p className="text-xs drop-shadow-md" style={{color: 'hsl(40, 9%, 60%)'}}>{T.questionsManagementDesc}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/site-settings" passHref>
            <Card className="backdrop-blur-lg bg-white/20 dark:bg-black/15 border border-white/30 dark:border-white/20 hover:bg-white/25 dark:hover:bg-black/20 transition-all duration-300 cursor-pointer rounded-xl shadow-xl hover:shadow-2xl hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium drop-shadow-md" style={{color: 'hsl(40, 9%, 50%)'}}>{T.siteSettings}</CardTitle>
                <Settings className="h-5 w-5 drop-shadow-md" style={{color: 'hsl(40, 9%, 55%)'}} />
              </CardHeader>
              <CardContent>
                <p className="text-xs drop-shadow-md" style={{color: 'hsl(40, 9%, 60%)'}}>{T.siteSettingsDesc}</p>
              </CardContent>
            </Card>
          </Link>
        </CardContent>
      </Card>

      <div className="flex justify-center items-center">
        <div className="backdrop-blur-lg bg-white/15 dark:bg-black/10 border border-white/25 dark:border-white/10 rounded-xl p-4 shadow-xl">
          <Button 
            variant="destructive" 
            onClick={handleLogout} 
            disabled={isLoggingOut} 
            className="w-full sm:w-auto backdrop-blur-md bg-red-600/90 dark:bg-red-500/80 hover:bg-red-700/90 dark:hover:bg-red-600/80 border border-red-500/30 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isLoggingOut ? (
              <Loader2 className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4 animate-spin`} />
            ) : (
              <LogOut className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} />
            )}
            {isLoggingOut ? T.loggingOutButton : T.logoutButton}
          </Button>
        </div>
      </div>
    </div>
  );
}
