
"use client";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, ExternalLink, FileText, BookOpen, Library, ArrowLeft, PackageIcon as DefaultResourceIcon, CassetteTape, MonitorPlay } from "lucide-react"; // Added CassetteTape, MonitorPlay
import { supabase } from "@/lib/supabase";
import type { Resource, Collection } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import NextImage from "next/image";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useParams, useRouter, useSearchParams } from "next/navigation"; // Added useSearchParams

const resourceDisplayTypes = [ // Renamed to avoid conflict and broadened
  { value: "pdf", label: { en: "PDF", ar: "ملف PDF" }, icon: FileText, actionText: { en: "View PDF", ar: "عرض PDF"} },
  { value: "article", label: { en: "Article/Text", ar: "مقالة/نص" }, icon: FileText, actionText: { en: "Read Article", ar: "قراءة المقالة"} },
  { value: "audio", label: { en: "Audio", ar: "ملف صوتي" }, icon: CassetteTape, actionText: { en: "Listen Audio", ar: "استماع للصوت"} },
  { value: "video", label: { en: "Video", ar: "ملف فيديو" }, icon: MonitorPlay, actionText: { en: "Watch Video", ar: "مشاهدة الفيديو"} },
  // Add more types if needed
];

const publicResourceCategories = [
  { value: "all", label: { en: "All Categories", ar: "كل الفئات" } },
  { value: "aqidah", label: { en: "ʿAqīdah", ar: "عقيدة" } },
  { value: "ahadith", label: { en: "Aḥadīth", ar: "أحاديث" } },
  { value: "family", label: { en: "Family", ar: "الأسرة" } },
  { value: "business", label: { en: "Business", ar: "المعاملات" } },
  { value: "prayer", label: { en: "Prayer", ar: "الصلاة" } },
];

const resourceLanguagesList = [
  { value: "all", label: { en: "All Languages", ar: "كل اللغات" } },
  { value: "ar", label: { en: "Arabic", ar: "العربية" } },
  { value: "en", label: { en: "English", ar: "الإنجليزية" } },
];

export default function CollectionDetailsPage() {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ar'>('en');
  const [collection, setCollection] = useState<Collection | null>(null);
  const [resourcesInCollection, setResourcesInCollection] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams(); // For reading query parameters
  const collectionId = params.collectionId as string;
  const collectionTypeFromQuery = searchParams.get('type'); // e.g., 'audio', 'book'

  const pageTextDefinitions = useMemo(() => ({
    en: {
      pageTitleFallback: "Collection Details",
      backToLibraryButton: "Back to Library",
      backToAudioLibrary: "Back to Audio Library",
      backToBookLibrary: "Back to Book Library",
      resourcesInSection: "Resources in this Collection",
      noResourcesInCollection: "There are currently no resources in this collection.",
      loadErrorCollection: "Failed to load collection details.",
      loadErrorResources: "Failed to load resources for this collection.",
      resourceCoverAlt: "Cover image for resource",
      resourceIconAlt: "Resource icon",
      noDescription: "No description available.",
      categoryLabel: "Category",
      languageLabel: "Language",
      tagsLabel: "Tags",
      typeLabel: "Type",
    },
    ar: {
      pageTitleFallback: "تفاصيل المجموعة",
      backToLibraryButton: "العودة إلى المكتبة",
      backToAudioLibrary: "العودة إلى المكتبة الصوتية",
      backToBookLibrary: "العودة إلى مكتبة الكتب",
      resourcesInSection: "الموارد في هذه المجموعة",
      noResourcesInCollection: "لا توجد حاليًا موارد في هذه المجموعة.",
      loadErrorCollection: "فشل تحميل تفاصيل المجموعة.",
      loadErrorResources: "فشل تحميل موارد هذه المجموعة.",
      resourceCoverAlt: "صورة غلاف المورد",
      resourceIconAlt: "أيقونة المورد",
      noDescription: "لا يوجد وصف متاح.",
      categoryLabel: "الفئة",
      languageLabel: "اللغة",
      tagsLabel: "الوسوم",
      typeLabel: "النوع",
    }
  }), []);
  const T = pageTextDefinitions[currentLanguage];

  const pageTitle = collection?.name || T.pageTitleFallback;
  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  useEffect(() => {
    const storedLang = (localStorage.getItem('language') as 'en' | 'ar') || 'en';
    setCurrentLanguage(storedLang);
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'language' && event.newValue && (event.newValue === 'en' || event.newValue === 'ar')) {
        setCurrentLanguage(event.newValue as 'en' | 'ar');
      }
    };
    window.addEventListener('storage', handleStorageChange);

    if (collectionId) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          if (!supabase) {
            throw new Error("Supabase client is not initialized.");
          }
          const collectionResult = await supabase
            .from('collections')
            .select('*')
            .eq('id', collectionId)
            .single();

          if (collectionResult.error) throw new Error(T.loadErrorCollection + ": " + collectionResult.error.message);
          if (!collectionResult.data) throw new Error(T.loadErrorCollection + ": Collection not found.");
          setCollection(collectionResult.data);

          // Determine resource types to fetch based on collection_content_type or query param
          let resourceTypesToFetch: string[] = [];
          const colContentType = collectionResult.data.collection_content_type;

          if (colContentType === 'books') {
            resourceTypesToFetch = ['pdf', 'article'];
          } else if (colContentType === 'audio') {
            resourceTypesToFetch = ['audio'];
          } else if (colContentType === 'video') {
            resourceTypesToFetch = ['video'];
          } else {
            // Fallback or if collection_content_type is null/general
            // For now, let's default to book types if not specified, can be adjusted
             resourceTypesToFetch = ['pdf', 'article', 'audio', 'video', 'image', 'other'];
          }
          
          if (!supabase) {
            throw new Error("Supabase client is not initialized.");
          }
          const resourcesQuery = supabase
            .from('resources')
            .select('*')
            .eq('collection_id', collectionId)
            .order('created_at', { ascending: false });

          if (resourceTypesToFetch.length > 0) {
            resourcesQuery.in('type', resourceTypesToFetch);
          }
          
          const resourcesResult = await resourcesQuery;
          
          if (resourcesResult.error) throw new Error(T.loadErrorResources + ": " + resourcesResult.error.message);
          setResourcesInCollection(resourcesResult.data || []);

        } catch (error: any) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
          setCollection(null);
          setResourcesInCollection([]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    } else {
        setIsLoading(false);
        toast({ title: "Error", description: "Collection ID is missing.", variant: "destructive"});
        router.push('/library/books'); 
    }
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [collectionId, currentLanguage, T, toast, router, collectionTypeFromQuery]);

  const getResourceIcon = (type: string | undefined) => {
    if (!type) return <DefaultResourceIcon className="h-20 w-20 text-muted-foreground/70" />;
    const resourceTypeInfo = resourceDisplayTypes.find(rt => rt.value === type);
    const IconComponent = resourceTypeInfo?.icon || DefaultResourceIcon;
    return <IconComponent className="h-20 w-20 text-muted-foreground/70" />;
  };
  
  const getResourceActionText = (type: string) => {
    const typeInfo = resourceDisplayTypes.find(rt => rt.value === type);
    return typeInfo?.actionText[currentLanguage] || (currentLanguage === 'ar' ? 'فتح' : 'Open');
  };
  
  const getAudioFileType = (url: string): string | undefined => { // Keep this utility if audio files are directly linked
      if (!url) return undefined;
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.endsWith('.mp3')) return 'audio/mpeg';
      if (lowerUrl.endsWith('.ogg')) return 'audio/ogg';
      if (lowerUrl.endsWith('.wav')) return 'audio/wav';
      if (lowerUrl.includes('audio') || lowerUrl.includes('sound')) return 'audio/mpeg'; 
      return undefined;
  };


  const renderResourceCard = (res: Resource) => (
    <Card key={res.id} className="flex flex-col overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 rounded-lg bg-card h-full">
      <CardHeader className="p-0 relative aspect-[3/4] bg-muted">
        {res.cover_image_url ? (
          <NextImage
            key={res.cover_image_url}
            src={res.cover_image_url}
            alt={`${T.resourceCoverAlt} ${res.title}`}
            layout="fill"
            objectFit="cover"
            data-ai-hint={`${res.type || 'generic'} cover`}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; const parent = (e.target as HTMLImageElement).parentElement; if (parent) { const placeholder = parent.querySelector('.cover-placeholder'); if (placeholder) placeholder.classList.remove('hidden');}}}
          />
        ) : null}
        <div className={`cover-placeholder w-full h-full flex items-center justify-center ${res.cover_image_url ? 'hidden': ''}`} title={T.resourceIconAlt}>
            {getResourceIcon(res.type)}
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 space-y-2">
        <CardTitle className="text-xl font-semibold text-primary font-headline line-clamp-2 leading-tight" title={res.title}>{res.title}</CardTitle>
        <CardDescription className="text-sm text-foreground/75 line-clamp-3 leading-snug mb-1">{res.description || T.noDescription}</CardDescription>
         <div className="text-sm space-y-1 pt-2 border-t border-muted-foreground/10 mt-2">
            <p><strong className="font-medium text-muted-foreground">{T.typeLabel}:</strong> {resourceDisplayTypes.find(rt => rt.value === res.type)?.label[currentLanguage] || res.type}</p>
            <p><strong className="font-medium text-muted-foreground">{T.categoryLabel}:</strong> {publicResourceCategories.find(rc => rc.value === res.category)?.label[currentLanguage] || res.category}</p>
            <p><strong className="font-medium text-muted-foreground">{T.languageLabel}:</strong> {resourceLanguagesList.find(rl => rl.value === res.language)?.label[currentLanguage] || res.language}</p>
         </div>
         {res.tags && res.tags.length > 0 && (
            <div className="pt-2 border-t border-muted-foreground/10 mt-2">
                <p className="text-sm font-medium text-muted-foreground mb-1.5">{T.tagsLabel}:</p>
                <div className="flex flex-wrap gap-1.5">
                    {res.tags.slice(0, 5).map(tag => (<Badge key={tag} variant="outline" className="text-xs font-normal bg-accent/10 text-accent-foreground/80 border-accent/30">{tag}</Badge>))}
                    {res.tags.length > 5 && <Badge variant="outline" className="text-xs font-normal">...</Badge>}
                </div>
            </div>
         )}
         {res.type === 'audio' && res.url && (
            <div className="pt-2 border-t border-muted-foreground/10 mt-2">
                 <audio controls className="w-full h-10" preload="metadata">
                    <source src={res.url} type={getAudioFileType(res.url) || 'audio/mpeg'} />
                    Your browser does not support the audio element.
                </audio>
            </div>
         )}
      </CardContent>
      <CardFooter className="p-4 bg-muted/10 border-t mt-auto">
        <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm py-2 h-auto">
          <Link href={res.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className={`${currentLanguage === 'ar' ? 'ml-2 h-4 w-4' : 'mr-2 h-4 w-4'}`} />{getResourceActionText(res.type)}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-12 space-y-4 min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading collection...</p>
      </div>
    );
  }

  if (!collection && !isLoading) { 
    return (
      <div className="flex flex-col justify-center items-center py-12 space-y-4 min-h-[calc(100vh-200px)]">
        <p className="text-destructive text-lg">{T.loadErrorCollection}</p>
        <Button
          onClick={() =>
            router.push(
              '/library/books'
            )
          }
          variant="outline"
        >
          <ArrowLeft className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} /> 
          {T.backToBookLibrary}
        </Button>
      </div>
    );
  }
  
  if (!collection) {
    return (
        <div className="flex flex-col justify-center items-center py-12 space-y-4 min-h-[calc(100vh-200px)]">
            <p className="text-muted-foreground">Collection data is unavailable.</p>
            <Button onClick={() => router.push(collectionTypeFromQuery === 'audio' ? '/library/audio' : '/library/books')} variant="outline">
                 <ArrowLeft className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} /> {collectionTypeFromQuery === 'audio' ? T.backToAudioLibrary : T.backToBookLibrary}
            </Button>
        </div>
    );
  }


  return (
    <div className="space-y-8 w-full" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <header className="py-8 text-center">
            <div className="relative max-w-4xl mx-auto mb-8 aspect-[16/5] rounded-lg overflow-hidden shadow-lg bg-muted">
                {collection.cover_image_url ? (
                    <NextImage
                        src={collection.cover_image_url}
                        alt={`Cover for ${collection.name}`}
                        layout="fill"
                        objectFit="cover"
                        data-ai-hint="collection banner"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Library className="h-24 w-24 text-muted-foreground/30" />
                    </div>
                )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-6 flex flex-col justify-end">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 font-headline" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>
                        {collection.name}
                    </h1>
                </div>
            </div>
            {collection.description && (
                <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto px-4">
                    {collection.description}
                </p>
            )}
            <div className="mt-3 text-sm text-muted-foreground space-x-4 rtl:space-x-reverse">
                {collection.category && <span><strong>{T.categoryLabel}:</strong> {publicResourceCategories.find(rc => rc.value === collection.category)?.label[currentLanguage] || collection.category}</span>}
                {collection.language && <span><strong>{T.languageLabel}:</strong> {resourceLanguagesList.find(rl => rl.value === collection.language)?.label[currentLanguage] || collection.language}</span>}
            </div>
             <Button 
                onClick={() => router.push(collection.collection_content_type === 'audio' ? '/library/audio' : '/library/books')} 
                variant="outline" 
                className="mt-8"
             >
                <ArrowLeft className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} /> 
                {collection.collection_content_type === 'audio' ? T.backToAudioLibrary : T.backToBookLibrary}
            </Button>
        </header>

      <Separator />

      <section className="pt-2 pb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-8 text-center font-headline">
          {T.resourcesInSection}
        </h2>
        {resourcesInCollection.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {resourcesInCollection.map(renderResourceCard)}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-10">{T.noResourcesInCollection}</p>
        )}
      </section>
    </div>
  );
}

    