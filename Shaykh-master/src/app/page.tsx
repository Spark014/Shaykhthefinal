"use client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Mic, User, Headphones, MessageSquareQuote, Loader2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import { doc, getDoc } from "firebase/firestore";
import type { Resource } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathname } from "next/navigation"; 
import { useLanguage } from "@/context/LanguageContext"; 

interface FeaturedItemDisplay extends Resource {
  displayCategory: string;
  displayTypeActionText: string;
}

const publicResourceCategories = [
  { value: "all", label: { en: "All Categories", ar: "كل الفئات" } },
  { value: "aqidah", label: { en: "ʿAqīdah", ar: "عقيدة" } },
  { value: "ahadith", label: { en: "Aḥadīth", ar: "أحاديث" } },
  { value: "family", label: { en: "Family", ar: "الأسرة" } },
  { value: "business", label: { en: "Business", ar: "المعاملات" } },
  { value: "prayer", label: { en: "Prayer", ar: "الصلاة" } },
];

const resourceTypesList = [
  { value: "pdf", label: { en: "PDF", ar: "ملف PDF" }, actionText: { en: "View PDF", ar: "عرض PDF" } },
  { value: "audio", label: { en: "Audio", ar: "ملف صوتي" }, actionText: { en: "Listen Audio", ar: "استماع للصوت" } },
  { value: "video", label: { en: "Video", ar: "ملف فيديو" }, actionText: { en: "Watch Video", ar: "مشاهدة الفيديو" } },
  { value: "article", label: { en: "Article/Text", ar: "مقالة/نص" }, actionText: { en: "Read Article", ar: "قراءة المقالة" } },
  { value: "image", label: { en: "Image", ar: "صورة" }, actionText: { en: "View Image", ar: "عرض الصورة" } },
  { value: "other", label: { en: "Other", ar: "أخرى" }, actionText: { en: "Open Link", ar: "فتح الرابط" } },
];


interface ShortcutItem {
  href: string;
  labels: { en: string; ar: string };
  icon: React.ElementType;
  desc: { en: string; ar: string };
  dataAiHint: string;
}

const shortcutNavItems: ShortcutItem[] = [
  { href: '/biography', labels: { en: 'Biography', ar: 'السيرة الذاتية' }, icon: User, desc: {en: "Learn about the Shaykh's life and work.", ar: "تعرف على حياة الشيخ وأعماله."}, dataAiHint: "portrait scholar" },
  { href: '/library/books', labels: { en: 'Books', ar: 'الكتب' }, icon: BookOpen, desc: {en: "Browse a collection of books and articles.", ar: "تصفح مجموعة من الكتب والمقالات."}, dataAiHint: "library books"  },
  { href: '/library/audio', labels: { en: 'Audio Library', ar: 'المكتبة الصوتية' }, icon: Headphones, desc: {en: "Listen to lectures and audio recordings.", ar: "استمع إلى المحاضرات والتسجيلات الصوتية."}, dataAiHint: "audio collection"  },
  { href: '/fatawa', labels: { en: 'Ask a Question', ar: 'إرسال سؤال' }, icon: MessageSquareQuote, desc: {en: "Submit your questions to the Shaykh.", ar: "أرسل أسئلتك إلى الشيخ."}, dataAiHint: "question mark"  },
];

export default function HomePage() {
  const { currentLanguage } = useLanguage();
  const [featuredItems, setFeaturedItems] = useState<FeaturedItemDisplay[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const pathname = usePathname();

  const T = useMemo(() => ({
    en: {
      welcomeTitle: "Welcome to the Al-Sa'd Scholarly Portal",
      welcomeSubtitle: "Access the works, lessons, and insights of Shaykh ʿAbdullāh ibn ʿAbd al-Raḥmān al-Saʿd.",
      exploreLessons: "Explore Lessons",
      browseLibrary: "Browse All Resources",
      featuredContent: "Featured Content",
      learnMore: "Learn More", 
      aboutShaykhTitle: "About the Shaykh",
      aboutShaykhDescription: "Shaykh ʿAbdullāh ibn ʿAbd al-Raḥmān al-Saʿd is a renowned scholar known for his deep knowledge in Hadith, Fiqh, and other Islamic sciences. Explore his biography and contributions to Islamic scholarship.",
      readBiography: "Read Biography",
      quickAccess: "Quick Access",
      goToPage: "Go to Page",
      noFeaturedContent: "No featured content available at the moment. Please check back later or explore our library.",
      errorFetchingSettings: "Could not load site settings for featured content.",
      errorFetchingResources: "Could not load details for featured content.",
      errorClientOffline: "You appear to be offline. Featured content could not be loaded.",
      noDescription: "No description available.",
      defaultCategory: "Resource",
    },
    ar: {
      welcomeTitle: "مرحبًا بكم في البوابة العلمية للسعد",
      welcomeSubtitle: "تصفّح أعمال، دروس،وفوائد الشيخ عبد الله بن عبد الرحمن السعد.",
      exploreLessons: "استكشف الدروس",
      browseLibrary: "تصفح جميع الموارد",
      featuredContent: "المواد المميّزة",
      learnMore: "اعرف المزيد", 
      aboutShaykhTitle: "عن الشيخ",
      aboutShaykhDescription: "الشيخ عبد الله بن عبد الرحمن السعد عالم جليل معروف بعلمه العميق في الحديث والفقه والعلوم الإسلامية. اكتشفوا سيرته الذاتية ومساهماته في العلم الشرعي.",
      readBiography: "اقرأ السيرة الذاتية",
      quickAccess: "الوصول الفوري",
      goToPage: "اذهب إلى الصفحة",
      noFeaturedContent: "لا يوجد محتوى مميز متاح حاليًا. يرجى التحقق مرة أخرى لاحقًا أو تصفح مكتبتنا.",
      errorFetchingSettings: "لم نتمكن من تحميل إعدادات الموقع للمحتوى المميز.",
      errorFetchingResources: "لم نتمكن من تحميل تفاصيل المحتوى المميز.",
      errorClientOffline: "يبدو أنك غير متصل بالإنترنت. تعذر تحميل المحتوى المميز.",
      noDescription: "لا يوجد وصف متاح.",
      defaultCategory: "مورد",
    }
  }[currentLanguage]), [currentLanguage]);

  useEffect(() => {
    setIsLoadingSettings(true); 
    setIsLoadingResources(false); 
    setSettingsError(null);
    setResourcesError(null);
    setFeaturedItems([]); 

    const fetchFeaturedContent = async () => {
      try {
        if (!db) {
          throw new Error("Firestore database is not initialized.");
        }
        const settingsDocRef = doc(db, "site_config", "main_settings");
        const docSnap = await getDoc(settingsDocRef);

        if (docSnap.exists()) {
          const settingsData = docSnap.data();
          const ids = settingsData?.featuredResourceIds_home?.filter((id: string | null) => id) as string[] || [];
          
          if (ids.length > 0) {
            setIsLoadingResources(true);
            if (!supabase) {
              throw new Error("Supabase client is not initialized.");
            }
            const { data: resourcesData, error: supabaseError } = await supabase
              .from('resources')
              .select('*')
              .in('id', ids);

            if (supabaseError) {
              throw new Error(`Supabase error: ${supabaseError.message}`);
            }
            
            const orderedResources = ids.map(id => resourcesData?.find(res => res.id === id)).filter(Boolean) as Resource[];

            const displayItems = orderedResources.map(res => {
              const categoryInfo = publicResourceCategories.find(cat => cat.value === res.category);
              const typeInfo = resourceTypesList.find(rt => rt.value === res.type);
              return {
                ...res,
                displayCategory: categoryInfo ? categoryInfo.label[currentLanguage] : (res.category || T.defaultCategory),
                displayTypeActionText: typeInfo ? typeInfo.actionText[currentLanguage] : T.learnMore,
              };
            });
            setFeaturedItems(displayItems);
            setResourcesError(null);
          } else {
            setFeaturedItems([]); 
          }
        } else {
          setSettingsError(T.errorFetchingSettings + " (Document not found)");
          setFeaturedItems([]);
        }
      } catch (error: any) {
        console.error("Error fetching featured content:", error);
        if (error.message && error.message.toLowerCase().includes('client is offline')) {
          setSettingsError(T.errorClientOffline);
        } else if (error.message && error.message.includes("permission")) {
          setSettingsError("Firestore permission error.");
        } else {
          setSettingsError(T.errorFetchingSettings);
        }
        setFeaturedItems([]);
      } finally {
        setIsLoadingSettings(false);
        setIsLoadingResources(false);
      }
    };

    if (db && supabase) {
      fetchFeaturedContent();
    }
  }, [currentLanguage, T, db, supabase, pathname]); 


  return (
    <div className="space-y-12 md:space-y-16 lg:space-y-20" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <section className="text-center py-10 md:py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg shadow-inner
        backdrop-blur-md bg-white/60 dark:bg-background/60 border border-white/30 dark:border-border">
        <div className="p-5">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl text-primary mb-4 sm:mb-6 font-headline">
            {T.welcomeTitle}
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-foreground/80 max-w-2xl md:max-w-3xl mx-auto mb-8 sm:mb-10">
            {T.welcomeSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground w-auto">
              <Link href="/library/audio">{T.exploreLessons} <Mic className={currentLanguage === 'ar' ? "mr-2 h-5 w-5" : "ml-2 h-5 w-5"} /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/5 w-auto">
              <Link href="/resources">{T.browseLibrary} <BookOpen className={currentLanguage === 'ar' ? "mr-2 h-5 w-5" : "ml-2 h-5 w-5"} /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl sm:text-3xl font-semibold text-primary mb-8 text-center font-headline">{T.quickAccess}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {shortcutNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.href} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg text-center items-center bg-card">
                <CardHeader className="p-6 items-center">
                  <div className="p-4 bg-primary/10 rounded-full mb-4 inline-block">
                    <Icon className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl font-semibold text-primary font-headline">{item.labels[currentLanguage]}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow p-4 pt-0">
                  <CardDescription className="text-foreground/75 text-sm line-clamp-2">{item.desc[currentLanguage]}</CardDescription>
                </CardContent>
                <CardFooter className="p-6 w-full">
                  <Button asChild variant="outline" className="w-full border-primary text-primary hover:bg-primary/5">
                    <Link href={item.href}>
                      {T.goToPage} <ArrowRight className={currentLanguage === 'ar' ? "mr-2 h-4 w-4" : "ml-2 h-4 w-4"} />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-2xl sm:text-3xl font-semibold text-primary mb-8 text-center font-headline">{T.featuredContent}</h2>
        {isLoadingSettings || isLoadingResources ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={`skeleton-${index}`} className="flex flex-col overflow-hidden rounded-lg shadow-md">
                <Skeleton className="h-48 w-full" />
                <CardContent className="flex-grow p-6 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </CardContent>
                <CardFooter className="p-6 bg-muted/50">
                  <Skeleton className="h-8 w-1/3" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : settingsError ? (
          <p className="text-center text-destructive">{settingsError}</p>
        ) : resourcesError ? (
          <p className="text-center text-destructive">{resourcesError}</p>
        ) : featuredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {featuredItems.map((item) => (
              <Card key={item.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
                <CardHeader className="p-0 relative aspect-video bg-muted"> {}
                  <Image
                    src={item.cover_image_url || `https://placehold.co/600x337.png?text=${encodeURIComponent(item.title)}`}
                    alt={item.title}
                    layout="fill"
                    objectFit="cover"
                    className="object-cover"
                    data-ai-hint={item.type === 'book' ? 'book cover' : (item.type === 'audio' || item.type === 'lesson' ? 'lecture mosque' : 'resource image')}
                  />
                </CardHeader>
                <CardContent className="flex-grow p-6">
                  <CardTitle className="text-lg md:text-xl font-semibold mb-2 text-primary font-headline line-clamp-2" title={item.title}>{item.title}</CardTitle>
                  <span className="text-xs uppercase font-semibold tracking-wider text-accent mb-2 block">{item.displayCategory}</span>
                  <CardDescription className="text-foreground/75 text-sm line-clamp-3">
                    {item.description || T.noDescription}
                  </CardDescription>
                </CardContent>
                <CardFooter className="p-6 bg-muted/50">
                  <Button asChild variant="link" className="text-primary p-0 hover:underline">
                    <Link href={item.url} target="_blank" rel="noopener noreferrer">
                      {item.displayTypeActionText} <ArrowRight className={currentLanguage === 'ar' ? "mr-2 h-4 w-4" : "ml-2 h-4 w-4"} />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">{T.noFeaturedContent}</p>
        )}
      </section>

      <section className="py-10 md:py-12">
        <Card className="bg-primary text-primary-foreground p-6 sm:p-8 md:p-12 rounded-lg shadow-xl">
          <CardHeader className="p-0 mb-4 sm:mb-6">
            <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold text-center font-headline">{T.aboutShaykhTitle}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-base sm:text-lg text-center max-w-3xl mx-auto mb-6 sm:mb-8">
              {T.aboutShaykhDescription}
            </p>
          </CardContent>
          <CardFooter className="flex justify-center p-0">
            <Button asChild size="lg" variant="secondary" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/biography">{T.readBiography} <ArrowRight className={currentLanguage === 'ar' ? "mr-2 h-5 w-5" : "ml-2 h-5 w-5"} /></Link>
            </Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}

