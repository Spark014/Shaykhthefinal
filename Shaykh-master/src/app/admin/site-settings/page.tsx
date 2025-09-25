
"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Settings, Loader2, ArrowLeft, Save, Star, Info } from "lucide-react";
import { auth, db, isFirebaseConfigValid, firebaseInitializationError } from "@/lib/firebase"; // Import Firebase utils
import { supabase, clientInitializationError as supabaseClientError } from "@/lib/supabase"; // Import Supabase utils
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";
import type { Resource } from "@/types/database";
import { Separator } from "@/components/ui/separator";

interface SiteSettingsData {
  siteTitle_en: string;
  siteTitle_ar: string;
  contactEmail: string;
  footerText_en: string;
  footerText_ar: string;
  featuredResourceIds_home?: (string | null)[]; 
  updatedAt?: any;
}

interface SelectableResource {
  id: string;
  title: string;
}

const NUM_FEATURED_ITEMS = 3;

export default function SiteSettingsPage() {
  const { currentLanguage } = useLanguage();
  const [isLoadingSettings, setIsLoadingSettings] = useState(true); 
  const [isFetchingResources, setIsFetchingResources] = useState(true); 
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const [settings, setSettings] = useState<SiteSettingsData>({
    siteTitle_en: "Al-Sa'd Scholarly Portal",
    siteTitle_ar: "بوابة السعد العلمية",
    contactEmail: "contact@example.com",
    footerText_en: `© 2025 Al-Sa'd Scholarly Portal. All rights reserved.`,
    footerText_ar: `© 2025 بوابة السعد العلمية. جميع الحقوق محفوظة.`,
    featuredResourceIds_home: Array(NUM_FEATURED_ITEMS).fill(null),
  });

  const [allSiteResources, setAllSiteResources] = useState<SelectableResource[]>([]);
  const [overallError, setOverallError] = useState<string | null>(null);


  useEffect(() => {
    let errorMsg = "";
    if (!isFirebaseConfigValid && firebaseInitializationError) {
        errorMsg += `Firebase Error: ${firebaseInitializationError}. `;
    }
    if (supabaseClientError) {
         errorMsg += `Supabase Client Error: ${supabaseClientError}. `;
    }
    if(errorMsg) {
        setOverallError(errorMsg + "Site settings and resource selection might be affected.");
        setIsLoadingSettings(false);
        setIsFetchingResources(false);
    }
  }, []);

  const T = useMemo(() => ({
    en: {
      pageTitle: "Site Settings",
      pageDescription: "Manage general website settings and homepage featured content.",
      siteTitleEnLabel: "Site Title (English)",
      siteTitleArLabel: "Site Title (Arabic)",
      contactEmailLabel: "Contact Email",
      footerTextEnLabel: "Footer Text (English) - Use {year} for current year.",
      footerTextArLabel: "Footer Text (Arabic) - Use {year} for current year.",
      saveButton: "Save Settings",
      savingButton: "Saving...",
      saveSuccessTitle: "Settings Saved",
      saveSuccessDesc: "Site settings have been updated successfully.",
      saveErrorTitle: "Error Saving Settings",
      saveErrorDesc: "Could not save settings. Please try again.",
      fetchErrorTitle: "Error Fetching Settings",
      fetchErrorDesc: "Could not load site settings.",
      fetchErrorClientOffline: "You appear to be offline. Site settings could not be loaded. Please check your connection and try again.",
      fetchResourcesErrorDesc: "Could not load resources for selection.",
      backToDashboard: "Back to Dashboard",
      featuredContentSectionTitle: "Homepage Featured Content",
      featuredContentSectionDesc: `Select up to ${NUM_FEATURED_ITEMS} resources to feature on the homepage. These will be displayed prominently.`,
      featuredItemLabel: (num: number) => `Featured Item ${num}`,
      selectResourcePlaceholder: "Select a resource...",
      noneOption: "None / Empty Slot",
      generalSettingsTitle: "General Site Information",
      generalSettingsDesc: "Configure core details for your scholarly portal.",
      featuredContentNote: "If fewer than 3 items are selected, the homepage will adjust. Selected items need corresponding data in the resources table.",
      configErrorWarning: "Warning: There are issues with Firebase or Supabase configuration. Functionality may be limited.",
    },
    ar: {
      pageTitle: "إعدادات الموقع",
      pageDescription: "إدارة الإعدادات العامة للموقع والمحتوى المميز للصفحة الرئيسية.",
      siteTitleEnLabel: "عنوان الموقع (الإنجليزية)",
      siteTitleArLabel: "عنوان الموقع (العربية)",
      contactEmailLabel: "البريد الإلكتروني للتواصل",
      footerTextEnLabel: "نص التذييل (الإنجليزية) - استخدم {year} للسنة الحالية.",
      footerTextArLabel: "نص التذييل (العربية) - استخدم {year} للسنة الحالية.",
      saveButton: "حفظ الإعدادات",
      savingButton: "جارٍ الحفظ...",
      saveSuccessTitle: "تم حفظ الإعدادات",
      saveSuccessDesc: "تم تحديث إعدادات الموقع بنجاح.",
      saveErrorTitle: "خطأ في حفظ الإعدادات",
      saveErrorDesc: "لم يتم حفظ الإعدادات. يرجى المحاولة مرة أخرى.",
      fetchErrorTitle: "خطأ في جلب الإعدادات",
      fetchErrorDesc: "لم يتم تحميل إعدادات الموقع.",
      fetchErrorClientOffline: "يبدو أنك غير متصل بالإنترنت. تعذر تحميل إعدادات الموقع. يرجى التحقق من اتصالك والمحاولة مرة أخرى.",
      fetchResourcesErrorDesc: "لم يتم تحميل الموارد للاختيار.",
      backToDashboard: "العودة إلى لوحة التحكم",
      featuredContentSectionTitle: "المحتوى المميز للصفحة الرئيسية",
      featuredContentSectionDesc: `اختر حتى ${NUM_FEATURED_ITEMS} موارد لعرضها بشكل بارز في الصفحة الرئيسية.`,
      featuredItemLabel: (num: number) => `العنصر المميز ${num}`,
      selectResourcePlaceholder: "اختر موردًا...",
      noneOption: "لا شيء / خانة فارغة",
      generalSettingsTitle: "معلومات الموقع العامة",
      generalSettingsDesc: "تكوين التفاصيل الأساسية لبوابتك العلمية.",
      featuredContentNote: "إذا تم اختيار أقل من 3 عناصر، ستتكيف الصفحة الرئيسية. تحتاج العناصر المختارة إلى بيانات مقابلة في جدول الموارد.",
      configErrorWarning: "تحذير: توجد مشكلات في تكوين Firebase أو Supabase. قد تكون الوظائف محدودة.",
    }
  }[currentLanguage]), [currentLanguage]);


  const fetchSiteResources = useCallback(async () => {
    if (!supabase || overallError) {
        setIsFetchingResources(false);
        if(!overallError) toast({ title: T.fetchErrorTitle, description: "Supabase client not available for fetching resources.", variant: "destructive" });
        return;
    }
    setIsFetchingResources(true);
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('id, title')
        .order('title', { ascending: true });

      if (error) throw error;
      setAllSiteResources(data || []);
    } catch (error: any) {
      toast({ title: T.fetchErrorTitle, description: T.fetchResourcesErrorDesc, variant: "destructive" });
    } finally {
      setIsFetchingResources(false);
    }
  }, [supabase, T, toast, overallError]);

  const fetchSettings = useCallback(async () => {
    if (!db || overallError) {
        setIsLoadingSettings(false);
        if(!overallError) toast({ title: T.fetchErrorTitle, description: "Firestore client not available for fetching settings.", variant: "destructive" });
        return;
    }
    setIsLoadingSettings(true);
    try {
      const settingsDocRef = doc(db, "site_config", "main_settings");
      const docSnap = await getDoc(settingsDocRef);
      if (docSnap.exists()) {
        const loadedSettings = docSnap.data() as SiteSettingsData;
        const currentFeatured = loadedSettings.featuredResourceIds_home || [];
        const normalizedFeatured = Array(NUM_FEATURED_ITEMS).fill(null).map((_, i) => currentFeatured[i] || null);
        setSettings(prevSettings => ({ 
            ...prevSettings, 
            ...loadedSettings, 
            footerText_en: loadedSettings.footerText_en.replace('{year}', '2025'), // Ensure new year format
            footerText_ar: loadedSettings.footerText_ar.replace('{year}', '٢٠٢٥'), // Ensure new year format
            featuredResourceIds_home: normalizedFeatured 
        }));
      } else {
        // If no settings found, initialize with defaults (already in useState, but ensure featured is array)
        setSettings(prev => ({ 
            ...prev, 
            featuredResourceIds_home: Array(NUM_FEATURED_ITEMS).fill(null)
        }));
      }
    } catch (error: any) {
      let errorMessage = T.fetchErrorDesc;
      if (error.message && error.message.toLowerCase().includes('client is offline')) {
        errorMessage = T.fetchErrorClientOffline;
      }
      toast({ title: T.fetchErrorTitle, description: errorMessage, variant: "destructive" });
    }
    setIsLoadingSettings(false);
  }, [db, T, toast, overallError]); 


  useEffect(() => {
    if (!auth) {
        setOverallError(prev => (prev ? prev + " Firebase auth not initialized." : "Firebase auth not initialized."));
        setIsLoadingSettings(false);
        setIsFetchingResources(false);
        router.replace('/admin/login');
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        if (!overallError) { // Only fetch if no initial config errors
            await fetchSettings();
            await fetchSiteResources();
        }
      } else {
        router.replace('/admin/login');
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [router, fetchSettings, fetchSiteResources, overallError]); 

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleFeaturedItemChange = (index: number, value: string | null) => {
    setSettings(prev => {
      const newFeaturedIds = [...(prev.featuredResourceIds_home || Array(NUM_FEATURED_ITEMS).fill(null))];
      newFeaturedIds[index] = value === "null_option" ? null : value; 
      return { ...prev, featuredResourceIds_home: newFeaturedIds };
    });
  };

  const handleSaveSettings = async () => {
    if (!db || overallError) {
        toast({ title: T.saveErrorTitle, description: "Firestore client not available.", variant: "destructive" });
        return;
    }
    setIsSaving(true);
    try {
      const settingsDocRef = doc(db, "site_config", "main_settings");
      const settingsToSave: SiteSettingsData = {
        ...settings,
        footerText_en: settings.footerText_en.replace('{year}', '2025'), // Ensure new year format
        footerText_ar: settings.footerText_ar.replace('{year}', '٢٠٢٥'), // Ensure new year format
        featuredResourceIds_home: settings.featuredResourceIds_home && settings.featuredResourceIds_home.length === NUM_FEATURED_ITEMS 
          ? settings.featuredResourceIds_home 
          : Array(NUM_FEATURED_ITEMS).fill(null).map((_, i) => settings.featuredResourceIds_home?.[i] || null),
        updatedAt: serverTimestamp()
      };
      await setDoc(settingsDocRef, settingsToSave, { merge: true });
      toast({ title: T.saveSuccessTitle, description: T.saveSuccessDesc });
    } catch (error: any) {
      let errorMessage = T.saveErrorDesc;
      if (error.message && error.message.toLowerCase().includes('client is offline')) {
          errorMessage = "You appear to be offline. Settings could not be saved.";
      }
      toast({ title: T.saveErrorTitle, description: errorMessage, variant: "destructive" });
    }
    setIsSaving(false);
  };

  if ((isLoadingSettings || isFetchingResources) && !currentUser && !overallError) { 
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <header className="text-center">
        <Settings className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-2 font-headline">
          {T.pageTitle}
        </h1>
        <p className="text-lg text-muted-foreground">
          {T.pageDescription}
        </p>
      </header>

       {overallError && (
        <Card className="border-destructive bg-destructive/10 text-destructive-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5"/> Configuration Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{T.configErrorWarning}</p>
            <p className="text-xs mt-2">{overallError}</p>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg max-w-3xl mx-auto">
        <CardHeader>
            <div className="flex items-center gap-3">
                <Star className="h-6 w-6 text-primary" />
                <CardTitle className="font-headline text-2xl">{T.featuredContentSectionTitle}</CardTitle>
            </div>
            <CardDescription>{T.featuredContentSectionDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
            {isLoadingSettings || isFetchingResources ? ( 
                 Array(NUM_FEATURED_ITEMS).fill(0).map((_, index) => (
                    <div key={`loader-${index}`} className="space-y-2 pb-4 mb-4 border-b last:border-b-0 last:pb-0 last:mb-0">
                        <Label className="text-base font-medium">{T.featuredItemLabel(index + 1)}</Label>
                        <div className="h-10 w-full bg-muted rounded-md animate-pulse"></div>
                    </div>
                 ))
            ) : (
                Array(NUM_FEATURED_ITEMS).fill(0).map((_, index) => (
                    <div key={index} className="space-y-2 pb-4 mb-4 border-b last:border-b-0 last:pb-0 last:mb-0">
                        <Label htmlFor={`featuredItem-${index}`} className="text-base font-medium">{T.featuredItemLabel(index + 1)}</Label>
                        <Select
                        value={settings.featuredResourceIds_home?.[index] || "null_option"}
                        onValueChange={(value) => handleFeaturedItemChange(index, value)}
                        disabled={isSaving || isFetchingResources || !!overallError} 
                        >
                        <SelectTrigger id={`featuredItem-${index}`} className="h-11">
                            <SelectValue placeholder={T.selectResourcePlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="null_option">{T.noneOption}</SelectItem>
                            {allSiteResources.map((resource) => (
                            <SelectItem key={resource.id} value={resource.id}>
                                {resource.title}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                ))
            )}
             <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300 flex items-start space-x-2 rtl:space-x-reverse">
                <Info className="h-5 w-5 shrink-0 mt-0.5"/>
                <span>{T.featuredContentNote}</span>
            </div>
        </CardContent>

        <Separator className="my-6" />

        <CardHeader>
            <div className="flex items-center gap-3">
                 <Settings className="h-6 w-6 text-primary" />
                <CardTitle className="font-headline text-2xl">{T.generalSettingsTitle}</CardTitle>
            </div>
           <CardDescription>{T.generalSettingsDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
           {isLoadingSettings ? ( 
            <>
              <div className="space-y-2"><Label className="block h-5 w-1/3 bg-muted rounded animate-pulse"></Label><div className="h-10 w-full bg-muted rounded-md animate-pulse"></div></div>
              <div className="space-y-2"><Label className="block h-5 w-1/3 bg-muted rounded animate-pulse"></Label><div className="h-10 w-full bg-muted rounded-md animate-pulse"></div></div>
              <div className="space-y-2"><Label className="block h-5 w-1/3 bg-muted rounded animate-pulse"></Label><div className="h-10 w-full bg-muted rounded-md animate-pulse"></div></div>
              <div className="space-y-2"><Label className="block h-5 w-1/3 bg-muted rounded animate-pulse"></Label><div className="h-20 w-full bg-muted rounded-md animate-pulse"></div></div>
              <div className="space-y-2"><Label className="block h-5 w-1/3 bg-muted rounded animate-pulse"></Label><div className="h-20 w-full bg-muted rounded-md animate-pulse"></div></div>
            </>
           ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="siteTitle_en">{T.siteTitleEnLabel}</Label>
                <Input id="siteTitle_en" name="siteTitle_en" value={settings.siteTitle_en} onChange={handleInputChange} disabled={isSaving || !!overallError} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteTitle_ar">{T.siteTitleArLabel}</Label>
                <Input id="siteTitle_ar" name="siteTitle_ar" value={settings.siteTitle_ar} onChange={handleInputChange} dir="rtl" disabled={isSaving || !!overallError} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">{T.contactEmailLabel}</Label>
                <Input id="contactEmail" name="contactEmail" type="email" value={settings.contactEmail} onChange={handleInputChange} dir="ltr" disabled={isSaving || !!overallError} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="footerText_en">{T.footerTextEnLabel}</Label>
                <Textarea id="footerText_en" name="footerText_en" value={settings.footerText_en} onChange={handleInputChange} disabled={isSaving || !!overallError} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="footerText_ar">{T.footerTextArLabel}</Label>
                <Textarea id="footerText_ar" name="footerText_ar" value={settings.footerText_ar} onChange={handleInputChange} dir="rtl" disabled={isSaving || !!overallError} />
              </div>
            </>
           )}
        </CardContent>

        <CardFooter className="border-t mt-6">
          <Button onClick={handleSaveSettings} disabled={isSaving || isLoadingSettings || isFetchingResources || !!overallError} className="w-full sm:w-auto min-w-[150px]">
            {isSaving ? (
              <>
                <Loader2 className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4 animate-spin`} />
                {T.savingButton}
              </>
            ) : (
              <>
                <Save className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                {T.saveButton}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      <div className="flex justify-center">
        <Button variant="outline" asChild>
          <Link href="/admin/dashboard">
            <ArrowLeft className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} />
            {T.backToDashboard}
          </Link>
        </Button>
      </div>
    </div>
  );
}
