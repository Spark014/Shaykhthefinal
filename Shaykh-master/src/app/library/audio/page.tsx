"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, ExternalLink, CassetteTape, Headphones, Library as LibraryIcon, BookOpen, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Resource, Collection } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";
import NextImage from "next/image";
import { Badge } from "@/components/ui/badge";

const ITEMS_PER_PAGE = 20;

const audioResourceTypeConstants = [
  { value: "audio", label: { en: "Audio", ar: "ملف صوتي" }, icon: CassetteTape },
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

export default function AudioLibraryPage() {
  const { currentLanguage } = useLanguage();
  const [allAudioResources, setAllAudioResources] = useState<Resource[]>([]);
  const [filteredAudioResources, setFilteredAudioResources] = useState<Resource[]>([]);
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [filteredCollectionEntities, setFilteredCollectionEntities] = useState<Collection[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'audio' | 'collections'>('audio');
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLanguageFilter, setSelectedLanguageFilter] = useState<string>("all");

  const { toast } = useToast();

  const pageTextDefinitions = useMemo(() => ({
    en: {
      pageTitle: "Audio Library",
      pageSubtitle: "Listen to lectures, lessons, and audio recordings.",
      searchPlaceholderAudio: "Search audio resources...",
      searchPlaceholderCollections: "Search audio collections...",
      filterByCategoryLabel: "Filter by Category",
      filterByLanguageLabel: "Filter by Language",
      typeLabel: "Type",
      languageLabel: "Language",
      categoryLabel: "Category",
      collectionNameLabel: "Collection",
      tagsLabel: "Tags",
      openLinkButton: "Open Link",
      listenAudioButton: "Listen Audio",
      noAudioFound: "No audio resources found matching your criteria. Please try adjusting your search or filters.",
      noCollectionsFound: "No audio collections found matching your criteria. Please try adjusting your search or filters.",
      loadingResources: "Loading audio library...",
      loadError: "Failed to load audio library. Please try again.",
      coverImageAlt: "Cover image for",
      resourceIconAlt: "Audio icon",
      collectionCoverAlt: "Cover image for collection",
      noDescription: "No description available.",
      allAudioTab: "All Audio",
      collectionsTab: "Audio Collections",
      viewCollectionButton: "View Collection",
      previousPage: "Previous",
      nextPage: "Next",
      pageIndicator: (current: number, total: number) => `Page ${current} of ${total}`,
    },
    ar: {
      pageTitle: "المكتبة الصوتية",
      pageSubtitle: "استمع إلى المحاضرات والدروس والتسجيلات الصوتية.",
      searchPlaceholderAudio: "ابحث في الموارد الصوتية...",
      searchPlaceholderCollections: "ابحث في مجموعات الصوتيات...",
      filterByCategoryLabel: "تصفية حسب الفئة",
      filterByLanguageLabel: "تصفية حسب اللغة",
      typeLabel: "النوع",
      languageLabel: "اللغة",
      categoryLabel: "الفئة",
      collectionNameLabel: "المجموعة",
      tagsLabel: "الوسوم",
      openLinkButton: "فتح الرابط",
      listenAudioButton: "استماع للصوت",
      noAudioFound: "لم يتم العثور على موارد صوتية تطابق معايير البحث. يرجى محاولة تعديل بحثك أو عوامل التصفية.",
      noCollectionsFound: "لم يتم العثور على مجموعات صوتية تطابق معايير البحث. يرجى محاولة تعديل بحثك أو عوامل التصفية.",
      loadingResources: "جارٍ تحميل المكتبة الصوتية...",
      loadError: "فشل تحميل المكتبة الصوتية. يرجى المحاولة مرة أخرى.",
      coverImageAlt: "صورة الغلاف لـ",
      resourceIconAlt: "أيقونة صوت",
      collectionCoverAlt: "صورة غلاف المجموعة",
      noDescription: "لا يوجد وصف متاح.",
      allAudioTab: "كل الصوتيات",
      collectionsTab: "مجموعات الصوتيات",
      viewCollectionButton: "عرض المجموعة",
      previousPage: "السابق",
      nextPage: "التالي",
      pageIndicator: (current: number, total: number) => `صفحة ${current} من ${total}`,
    }
  }), []);
  const T = pageTextDefinitions[currentLanguage];

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [collectionsResult, audioResourcesResult] = await Promise.all([
        supabase!.from('collections').select('*').eq('collection_content_type', 'audio').order('name', { ascending: true }),
        supabase!.from('resources')
          .select('*, collection:collections(id, name)')
          .eq('type', 'audio') 
          .order('created_at', { ascending: false })
      ]);
      
      if (collectionsResult.error) throw collectionsResult.error;
      setAllCollections(collectionsResult.data || []);
      setFilteredCollectionEntities(collectionsResult.data || []); 

      if (audioResourcesResult.error) throw audioResourcesResult.error;
      setAllAudioResources(audioResourcesResult.data || []);
      setFilteredAudioResources(audioResourcesResult.data || []);

    } catch (error: any) {
      toast({ title: T.loadError, description: error.message || "An unknown error occurred", variant: "destructive" });
      setAllCollections([]);
      setAllAudioResources([]);
      setFilteredCollectionEntities([]);
      setFilteredAudioResources([]);
    } finally {
      setIsLoading(false);
    }
  }, [T.loadError, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    setCurrentPage(1);

    if (viewMode === 'audio') {
      let resourcesToFilter = allAudioResources;
      if (searchTerm) {
        resourcesToFilter = resourcesToFilter.filter(res =>
          (res.title?.toLowerCase() || '').includes(lowerSearchTerm) ||
          (res.description?.toLowerCase() || '').includes(lowerSearchTerm) ||
          (res.tags?.some(tag => tag.toLowerCase().includes(lowerSearchTerm))) ||
          (res.collection?.name?.toLowerCase() || '').includes(lowerSearchTerm)
        );
      }
      if (selectedCategory !== "all") {
        resourcesToFilter = resourcesToFilter.filter(res => res.category === selectedCategory);
      }
      if (selectedLanguageFilter !== "all") {
        resourcesToFilter = resourcesToFilter.filter(res => res.language === selectedLanguageFilter);
      }
      setFilteredAudioResources(resourcesToFilter);
    } else if (viewMode === 'collections') {
      let collectionsToFilter = allCollections;
      if (searchTerm) {
        collectionsToFilter = collectionsToFilter.filter(col =>
          (col.name?.toLowerCase() || '').includes(lowerSearchTerm) ||
          (col.description?.toLowerCase() || '').includes(lowerSearchTerm)
        );
      }
      if (selectedCategory !== "all") {
        collectionsToFilter = collectionsToFilter.filter(col => col.category === selectedCategory);
      }
      if (selectedLanguageFilter !== "all") {
        collectionsToFilter = collectionsToFilter.filter(col => col.language === selectedLanguageFilter);
      }
      setFilteredCollectionEntities(collectionsToFilter);
    }
  }, [searchTerm, selectedCategory, selectedLanguageFilter, allAudioResources, allCollections, viewMode]);

  const getResourceIcon = (type: string) => {
    const resourceTypeInfo = audioResourceTypeConstants.find(rt => rt.value === type);
    const IconComponent = resourceTypeInfo?.icon || CassetteTape;
    return <IconComponent className="h-20 w-20 text-muted-foreground/70" />;
  };
  
  const getAudioFileType = (url: string): string | undefined => {
      if (!url) return undefined;
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.endsWith('.mp3')) return 'audio/mpeg';
      if (lowerUrl.endsWith('.ogg')) return 'audio/ogg';
      if (lowerUrl.endsWith('.wav')) return 'audio/wav';
      if (lowerUrl.includes('audio') || lowerUrl.includes('sound')) return 'audio/mpeg'; 
      return undefined;
  };

  const renderAudioCard = (res: Resource) => (
    <Card key={`audio-${res.id}`} className="backdrop-blur-md bg-background/70 border border-border/30 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden">
      <CardHeader className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
          <div className="flex gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-muted/50 backdrop-blur-sm rounded-lg sm:rounded-xl overflow-hidden flex-shrink-0 border border-border/20">
              {res.cover_image_url ? (
                <NextImage
                  key={res.cover_image_url} 
                  src={res.cover_image_url} 
                  alt={`${T.coverImageAlt} ${res.title}`} 
                  layout="fill" 
                  objectFit="cover" 
                  data-ai-hint="audio cover"
                  onError={(e) => { 
                    (e.target as HTMLImageElement).style.display = 'none'; 
                    const parent = (e.target as HTMLImageElement).parentElement; 
                    if (parent) { 
                      const placeholder = parent.querySelector('.cover-placeholder'); 
                      if (placeholder) placeholder.classList.remove('hidden');
                    }
                  }}
                />
              ) : null}
              <div className={`cover-placeholder w-full h-full flex items-center justify-center ${res.cover_image_url ? 'hidden': ''}`} title={T.resourceIconAlt}>
                <CassetteTape className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/70" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg font-semibold text-primary font-headline line-clamp-2 leading-tight mb-1" title={res.title}>
                {res.title}
              </CardTitle>
              {res.collection?.name && (
                <Link href={`/library/collections/${res.collection_id}`} className="text-2xs sm:text-xs text-accent hover:underline font-medium block mb-1.5 sm:mb-2" title={res.collection.name}>
                  {T.collectionNameLabel}: {res.collection.name}
                </Link>
              )}
              <CardDescription className="text-xs sm:text-sm text-foreground/75 line-clamp-2 leading-snug mb-1.5 sm:mb-2">
                {res.description || T.noDescription}
              </CardDescription>
              <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 text-2xs sm:text-xs text-muted-foreground">
                <span className="truncate"><strong>{T.categoryLabel}:</strong> {publicResourceCategories.find(rc => rc.value === res.category)?.label[currentLanguage] || res.category}</span>
                <span className="truncate"><strong>{T.languageLabel}:</strong> {resourceLanguagesList.find(rl => rl.value === res.language)?.label[currentLanguage] || res.language}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
            <Button asChild size="sm" className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground h-8 sm:h-9">
              <Link href={res.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className={`${currentLanguage === 'ar' ? 'ml-1.5 h-3 w-3 sm:h-4 sm:w-4' : 'mr-1.5 h-3 w-3 sm:h-4 sm:w-4'}`} />
                {T.listenAudioButton}
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
        {res.tags && res.tags.length > 0 && (
          <div className="mb-2 sm:mb-3">
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {res.tags.slice(0, 6).map(tag => (
                <Badge key={tag} variant="outline" className="text-2xs sm:text-xs font-normal bg-accent/10 text-accent-foreground/80 border-accent/30">
                  {tag}
                </Badge>
              ))}
              {res.tags.length > 6 && <Badge variant="outline" className="text-2xs sm:text-xs font-normal">+{res.tags.length - 6} more</Badge>}
            </div>
          </div>
        )}
        {res.type === 'audio' && res.url && (
          <div className="mt-2 sm:mt-3">
            <audio controls className="w-full h-8 sm:h-10" preload="metadata">
              <source src={res.url} type={getAudioFileType(res.url) || 'audio/mpeg'} />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderCollectionCard = (collection: Collection) => (
    <Card key={`collection-${collection.id}`} className="backdrop-blur-md bg-background/70 border border-border/30 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div className="flex gap-4 flex-1">
            <div className="relative w-20 h-20 bg-muted/50 backdrop-blur-sm rounded-xl overflow-hidden flex-shrink-0 border border-border/20">
              {collection.cover_image_url ? (
                <NextImage
                  key={collection.cover_image_url} 
                  src={collection.cover_image_url} 
                  alt={`${T.collectionCoverAlt}: ${collection.name}`} 
                  layout="fill" 
                  objectFit="cover" 
                  data-ai-hint="collection cover audio"
                  onError={(e) => { 
                    (e.target as HTMLImageElement).style.display = 'none'; 
                    const parent = (e.target as HTMLImageElement).parentElement; 
                    if (parent) { 
                      const placeholder = parent.querySelector('.cover-placeholder'); 
                      if (placeholder) placeholder.classList.remove('hidden');
                    }
                  }}
                />
              ) : null}
              <div className={`cover-placeholder w-full h-full flex items-center justify-center ${collection.cover_image_url ? 'hidden': ''}`} title={collection.name}>
                <Headphones className="h-8 w-8 text-muted-foreground/60" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold text-primary font-headline line-clamp-2 leading-tight mb-1" title={collection.name}>
                {collection.name}
              </CardTitle>
              <CardDescription className="text-sm text-foreground/75 line-clamp-2 leading-snug mb-2">
                {collection.description || T.noDescription}
              </CardDescription>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {collection.category && (
                  <span><strong>{T.categoryLabel}:</strong> {publicResourceCategories.find(rc => rc.value === collection.category)?.label[currentLanguage] || collection.category}</span>
                )}
                {collection.language && (
                  <span><strong>{T.languageLabel}:</strong> {resourceLanguagesList.find(rl => rl.value === collection.language)?.label[currentLanguage] || collection.language}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href={`/library/collections/${collection.id}?type=audio`}>
                <BookOpen className={`${currentLanguage === 'ar' ? 'ml-1 h-3 w-3' : 'mr-1 h-3 w-3'}`} />
                {T.viewCollectionButton}
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );

  const currentData = viewMode === 'audio' ? filteredAudioResources : filteredCollectionEntities;
  const totalItems = currentData.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedItems = currentData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo(0, 0); 
  };

  const currentSearchPlaceholder = viewMode === 'audio' ? T.searchPlaceholderAudio : T.searchPlaceholderCollections;


  return (
    <div className="space-y-8 w-full max-w-[100vw] overflow-hidden" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <header className="text-center py-6 md:py-8 px-4 sm:px-0">
        <Headphones className="mx-auto h-12 w-12 md:h-16 md:w-16 text-primary mb-2 md:mb-4" />
        <h1 className="text-2xl md:text-4xl font-bold text-primary mb-2 md:mb-4 font-headline">{T.pageTitle}</h1>
        <p className="text-sm md:text-lg text-muted-foreground">{T.pageSubtitle}</p>
      </header>

      <Tabs 
        value={viewMode} 
        onValueChange={(value) => { 
            setViewMode(value as 'audio' | 'collections'); 
            setCurrentPage(1);
        }} 
        className="w-full"
      >
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-4 mb-6">
          <Card className="p-4 md:p-6 border border-border/30 rounded-xl shadow-lg backdrop-blur-md bg-background/70">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="relative md:col-span-1">
                    <Label htmlFor="search-audio-library" className="sr-only">{currentSearchPlaceholder}</Label>
                    <Search className={`absolute top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground ${currentLanguage === 'ar' ? 'right-3' : 'left-3'}`} />
                    <Input id="search-audio-library" type="search" placeholder={currentSearchPlaceholder} className={`${currentLanguage === 'ar' ? 'pr-10' : 'pl-10'} w-full`} value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} disabled={isLoading}/>
                  </div>
                  <div>
                    <Label htmlFor="filter-category" className="text-xs text-muted-foreground block mb-1">{T.filterByCategoryLabel}</Label>
                    <Select value={selectedCategory} onValueChange={(value) => {setSelectedCategory(value); setCurrentPage(1);}} dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'} disabled={isLoading}>
                      <SelectTrigger id="filter-category" className="w-full"><SelectValue placeholder={T.filterByCategoryLabel} /></SelectTrigger>
                      <SelectContent>{publicResourceCategories.map(rc => (<SelectItem key={rc.value} value={rc.value}>{rc.label[currentLanguage]}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="filter-language" className="text-xs text-muted-foreground block mb-1">{T.filterByLanguageLabel}</Label>
                    <Select value={selectedLanguageFilter} onValueChange={(value) => {setSelectedLanguageFilter(value); setCurrentPage(1);}} dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'} disabled={isLoading}>
                      <SelectTrigger id="filter-language" className="w-full"><SelectValue placeholder={T.filterByLanguageLabel} /></SelectTrigger>
                      <SelectContent>{resourceLanguagesList.map(rl => (<SelectItem key={rl.value} value={rl.value}>{rl.label[currentLanguage]}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
              </div>
          </Card>
          <TabsList className="grid w-full grid-cols-2 md:w-1/2 mx-auto mt-4">
            <TabsTrigger value="audio">{T.allAudioTab}</TabsTrigger>
            <TabsTrigger value="collections">{T.collectionsTab}</TabsTrigger>
          </TabsList>
        </div>

        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">{T.loadingResources}</p>
          </div>
        ) : (
          <div className="pb-10">
            <TabsContent value="audio" className="mt-0 outline-none ring-0 focus:ring-0 focus-visible:ring-0">
              {viewMode === 'audio' && (
                paginatedItems.length > 0 ? (
                  <div className="space-y-4 px-4 sm:px-0">
                    {paginatedItems.map(res => renderAudioCard(res as Resource))}
                  </div>
                ) : (
                  !isLoading && <p className="text-center text-muted-foreground py-12">{T.noAudioFound}</p>
                )
              )}
            </TabsContent>
            <TabsContent value="collections" className="mt-0 outline-none ring-0 focus:ring-0 focus-visible:ring-0">
              {viewMode === 'collections' && (
                  paginatedItems.length > 0 ? (
                    <div className="space-y-3 sm:space-y-4 px-4 sm:px-0">
                      {paginatedItems.map(col => renderCollectionCard(col as Collection))}
                    </div>
                  ) : (
                    !isLoading && <p className="text-center text-muted-foreground py-12">{T.noCollectionsFound}</p>
                  )
              )}
            </TabsContent>

            {totalItems > 0 && totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 sm:space-x-4 rtl:space-x-reverse mt-6 sm:mt-10 px-4 sm:px-0">
                <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                  variant="outline"
                  size="sm"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                >
                  <ArrowLeft className={`${currentLanguage === 'ar' ? 'ml-1.5 sm:ml-2' : 'mr-1.5 sm:mr-2'} h-3 w-3 sm:h-4 sm:w-4`} />
                  {T.previousPage}
                </Button>
                <span className="text-xs sm:text-sm text-muted-foreground px-1 sm:px-2">
                  {T.pageIndicator(currentPage, totalPages)}
                </span>
                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoading}
                  variant="outline"
                  size="sm"
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                >
                  {T.nextPage}
                  <ArrowRight className={`${currentLanguage === 'ar' ? 'mr-1.5 sm:mr-2' : 'ml-1.5 sm:ml-2'} h-3 w-3 sm:h-4 sm:w-4`} />
                </Button>
              </div>
            )}
          </div>
        )}
      </Tabs>
    </div>
  );
}

