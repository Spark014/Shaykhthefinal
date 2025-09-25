"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, ExternalLink, FileText, BookOpen, Library, PackageIcon as DefaultResourceIcon, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Resource, Collection } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import NextImage from "next/image";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 20;

const bookResourceTypesConstants = [ // Renamed to avoid conflict
  { value: "pdf", label: { en: "PDF", ar: "ملف PDF" }, icon: FileText },
  { value: "article", label: { en: "Article/Text", ar: "مقالة/نص" }, icon: FileText },
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

export default function BooksAndCollectionsPage() {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ar'>('en');
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [filteredCollectionEntities, setFilteredCollectionEntities] = useState<Collection[]>([]);
  const [allBookTypeResources, setAllBookTypeResources] = useState<Resource[]>([]);
  const [filteredBookTypeResources, setFilteredBookTypeResources] = useState<Resource[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'books' | 'collections'>('books');
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedLanguageFilter, setSelectedLanguageFilter] = useState<string>("all");

  const { toast } = useToast();

  const pageTextDefinitions = useMemo(() => ({
    en: {
      pageTitle: "Books & Collections",
      pageSubtitle: "Explore scholarly works, organized into collections or as individual items.",
      searchPlaceholderBooks: "Search books & articles...",
      searchPlaceholderCollections: "Search collections...",
      filterByCategoryLabel: "Filter by Category",
      filterByLanguageLabel: "Filter by Language",
      viewCollectionButton: "View Collection",
      viewBookButton: "View Book/Article",
      noCollectionsFound: "No book collections found matching your criteria.",
      noBooksFound: "No books or articles found matching your criteria.",
      loadingData: "Loading library data...",
      loadError: "Failed to load library data. Please try again.",
      collectionCoverAlt: "Cover image for collection",
      resourceCoverAlt: "Cover image for book/article",
      resourceIconAlt: "Book/Article icon",
      noDescription: "No description available.",
      categoryLabel: "Category",
      languageLabel: "Language",
      tagsLabel: "Tags",
      typeLabel: "Type",
      collectionNameLabel: "Collection",
      allBooksTab: "All Books & Articles",
      collectionsTab: "Book Collections",
      previousPage: "Previous",
      nextPage: "Next",
      pageIndicator: (current: number, total: number) => `Page ${current} of ${total}`,
    },
    ar: {
      pageTitle: "الكتب والمجموعات",
      pageSubtitle: "اكتشف الأعمال العلمية، منظمة في مجموعات أو كعناصر فردية.",
      searchPlaceholderBooks: "ابحث في الكتب والمقالات...",
      searchPlaceholderCollections: "ابحث في المجموعات...",
      filterByCategoryLabel: "تصفية حسب الفئة",
      filterByLanguageLabel: "تصفية حسب اللغة",
      viewCollectionButton: "عرض المجموعة",
      viewBookButton: "عرض الكتاب/المقالة",
      noCollectionsFound: "لم يتم العثور على مجموعات كتب تطابق معايير البحث.",
      noBooksFound: "لم يتم العثور على كتب أو مقالات تطابق معايير البحث.",
      loadingData: "جارٍ تحميل بيانات المكتبة...",
      loadError: "فشل تحميل بيانات المكتبة. يرجى المحاولة مرة أخرى.",
      collectionCoverAlt: "صورة غلاف المجموعة",
      resourceCoverAlt: "صورة غلاف الكتاب/المقالة",
      resourceIconAlt: "أيقونة كتاب/مقالة",
      noDescription: "لا يوجد وصف متاح.",
      categoryLabel: "الفئة",
      languageLabel: "اللغة",
      tagsLabel: "الوسوم",
      typeLabel: "النوع",
      collectionNameLabel: "المجموعة",
      allBooksTab: "كل الكتب والمقالات",
      collectionsTab: "مجموعات الكتب",
      previousPage: "السابق",
      nextPage: "التالي",
      pageIndicator: (current: number, total: number) => `صفحة ${current} من ${total}`,
    }
  }), [currentLanguage]); 
  const T = pageTextDefinitions[currentLanguage];

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!supabase) {
        throw new Error("Supabase client is not initialized.");
      }
      const [collectionsResult, bookTypeResourcesResult] = await Promise.all([
        supabase.from('collections').select('*').eq('collection_content_type', 'book').order('name', { ascending: true }),
        supabase.from('resources')
          .select('*, collection:collections(id, name)')
          .in('type', ['pdf', 'article'])
          .order('created_at', { ascending: false })
      ]);

      if (collectionsResult.error) throw collectionsResult.error;
      setAllCollections(collectionsResult.data || []);
      setFilteredCollectionEntities(collectionsResult.data || []); 
      
      if (bookTypeResourcesResult.error) throw bookTypeResourcesResult.error;
      setAllBookTypeResources(bookTypeResourcesResult.data || []);
      setFilteredBookTypeResources(bookTypeResourcesResult.data || []);

    } catch (error: any) {
      toast({ title: T.loadError, description: error.message, variant: "destructive" });
      setAllCollections([]);
      setAllBookTypeResources([]);
      setFilteredCollectionEntities([]);
      setFilteredBookTypeResources([]);
    } finally {
      setIsLoading(false);
    }
  }, [T.loadError, toast]); 

  useEffect(() => {
    const storedLang = (localStorage.getItem('language') as 'en' | 'ar') || 'en';
    setCurrentLanguage(storedLang);
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'language' && event.newValue && (event.newValue === 'en' || event.newValue === 'ar')) {
        setCurrentLanguage(event.newValue as 'en' | 'ar');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    fetchData();
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchData]);

  useEffect(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    setCurrentPage(1); // Reset page on any filter change

    if (viewMode === 'books') {
      let resourcesToFilter = allBookTypeResources;
      if (searchTerm) {
        resourcesToFilter = resourcesToFilter.filter(res =>
          (res.title?.toLowerCase() || '').includes(lowerSearchTerm) ||
          (res.description?.toLowerCase() || '').includes(lowerSearchTerm) ||
          (res.tags?.some(tag => tag.toLowerCase().includes(lowerSearchTerm))) ||
          (res.collection?.name?.toLowerCase() || '').includes(lowerSearchTerm)
        );
      }
      if (selectedCategoryFilter !== "all") {
        resourcesToFilter = resourcesToFilter.filter(res => res.category === selectedCategoryFilter);
      }
      if (selectedLanguageFilter !== "all") {
        resourcesToFilter = resourcesToFilter.filter(res => res.language === selectedLanguageFilter);
      }
      setFilteredBookTypeResources(resourcesToFilter);
    } else if (viewMode === 'collections') {
      let collectionsToFilter = allCollections;
      if (searchTerm) {
        collectionsToFilter = collectionsToFilter.filter(col =>
          (col.name?.toLowerCase() || '').includes(lowerSearchTerm) ||
          (col.description?.toLowerCase() || '').includes(lowerSearchTerm)
        );
      }
      if (selectedCategoryFilter !== "all") { // This filters collections by their own category
        collectionsToFilter = collectionsToFilter.filter(col => col.category === selectedCategoryFilter);
      }
      if (selectedLanguageFilter !== "all") { // This filters collections by their own language
        collectionsToFilter = collectionsToFilter.filter(col => col.language === selectedLanguageFilter);
      }
      setFilteredCollectionEntities(collectionsToFilter);
    }
  }, [searchTerm, selectedCategoryFilter, selectedLanguageFilter, allBookTypeResources, allCollections, viewMode]);

  const getResourceIcon = (type: string | undefined) => {
    if (!type) return <DefaultResourceIcon className="h-20 w-20 text-muted-foreground/70" />;
    const resourceTypeInfo = bookResourceTypesConstants.find(rt => rt.value === type); // Use renamed constant
    const IconComponent = resourceTypeInfo?.icon || FileText;
    return <IconComponent className="h-20 w-20 text-muted-foreground/70" />;
  };

  const renderBookCard = (res: Resource) => (
    <Card key={`book-${res.id}`} className="flex flex-col overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 rounded-lg bg-card h-full">
      <CardHeader className="p-0 relative aspect-[3/4] bg-muted">
        {res.cover_image_url ? (
          <NextImage
            key={res.cover_image_url} src={res.cover_image_url} alt={`${T.resourceCoverAlt} ${res.title}`} layout="fill" objectFit="cover" data-ai-hint="book cover" 
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; const parent = (e.target as HTMLImageElement).parentElement; if (parent) { const placeholder = parent.querySelector('.cover-placeholder'); if (placeholder) placeholder.classList.remove('hidden');}}}
          />
        ) : null}
        <div className={`cover-placeholder w-full h-full flex items-center justify-center ${res.cover_image_url ? 'hidden': ''}`} title={T.resourceIconAlt}>
            {getResourceIcon(res.type)}
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 space-y-2">
        <CardTitle className="text-xl font-semibold text-primary font-headline line-clamp-2 leading-tight" title={res.title}>{res.title}</CardTitle>
        {res.collection?.name && (
          <Link href={`/library/collections/${res.collection_id}`} className="text-xs text-accent hover:underline font-medium truncate block" title={res.collection.name}>
            {T.collectionNameLabel}: {res.collection.name}
          </Link>
        )}
        <CardDescription className="text-sm text-foreground/75 line-clamp-3 leading-snug mb-1">{res.description || T.noDescription}</CardDescription>
         <div className="text-sm space-y-1 pt-2 border-t border-muted-foreground/10 mt-2">
            <p><strong className="font-medium text-muted-foreground">{T.typeLabel}:</strong> {bookResourceTypesConstants.find(rt => rt.value === res.type)?.label[currentLanguage] || res.type}</p>
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
      </CardContent>
      <CardFooter className="p-4 bg-muted/10 border-t mt-auto">
        <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm py-2 h-auto">
          <Link href={res.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className={`${currentLanguage === 'ar' ? 'ml-2 h-4 w-4' : 'mr-2 h-4 w-4'}`} />{T.viewBookButton}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );

  const renderCollectionCard = (collection: Collection) => (
    <Card key={`collection-${collection.id}`} className="flex flex-col overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 rounded-lg bg-card h-full">
      <CardHeader className="p-0 relative aspect-[3/2] bg-muted">
        {collection.cover_image_url ? (
          <NextImage
            key={collection.cover_image_url} src={collection.cover_image_url} alt={`${T.collectionCoverAlt}: ${collection.name}`} layout="fill" objectFit="cover" data-ai-hint="collection cover library"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; const parent = (e.target as HTMLImageElement).parentElement; if (parent) { const placeholder = parent.querySelector('.cover-placeholder'); if (placeholder) placeholder.classList.remove('hidden');}}}
          />
        ) : null}
         <div className={`cover-placeholder w-full h-full flex items-center justify-center ${collection.cover_image_url ? 'hidden': ''}`} title={collection.name}>
            <Library className="h-24 w-24 text-muted-foreground/60" />
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 space-y-2">
        <CardTitle className="text-xl font-semibold text-primary font-headline line-clamp-2 leading-tight" title={collection.name}>{collection.name}</CardTitle>
        <CardDescription className="text-sm text-foreground/75 line-clamp-3 leading-snug mb-1">{collection.description || T.noDescription}</CardDescription>
        <div className="text-xs text-muted-foreground space-x-3 rtl:space-x-reverse pt-2 border-t border-muted-foreground/10 mt-2">
            {collection.category && <span><strong>{T.categoryLabel}:</strong> {publicResourceCategories.find(rc => rc.value === collection.category)?.label[currentLanguage] || collection.category}</span>}
            {collection.language && <span><strong>{T.languageLabel}:</strong> {resourceLanguagesList.find(rl => rl.value === collection.language)?.label[currentLanguage] || collection.language}</span>}
        </div>
      </CardContent>
      <CardFooter className="p-4 bg-muted/10 border-t mt-auto">
        <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm py-2 h-auto">
          <Link href={`/library/collections/${collection.id}`}>
            <BookOpen className={`${currentLanguage === 'ar' ? 'ml-2 h-4 w-4' : 'mr-2 h-4 w-4'}`} />{T.viewCollectionButton}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );

  const currentData = viewMode === 'books' ? filteredBookTypeResources : filteredCollectionEntities;
  const totalItems = currentData.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedItems = currentData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo(0, 0); 
  };
  
  const currentSearchPlaceholder = viewMode === 'books' ? T.searchPlaceholderBooks : T.searchPlaceholderCollections;

  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  return (
    <div className="space-y-8 w-full" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <header className="text-center py-8">
         <BookOpen className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4 font-headline">{T.pageTitle}</h1>
        <p className="text-lg text-muted-foreground">{T.pageSubtitle}</p>
      </header>

      <Tabs 
        value={viewMode} 
        onValueChange={(value) => { 
            setViewMode(value as 'books' | 'collections'); 
            setCurrentPage(1);
        }} 
        className="w-full"
      >
        <div className="sticky bg-background/95 backdrop-blur-sm py-4 mb-6">
          <Card className="p-4 md:p-6 border rounded-lg shadow-sm bg-card">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="relative md:col-span-1">
                    <Label htmlFor="search-library" className="sr-only">{currentSearchPlaceholder}</Label>
                    <Search className={`absolute top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground ${currentLanguage === 'ar' ? 'right-3' : 'left-3'}`} />
                    <Input id="search-library" type="search" placeholder={currentSearchPlaceholder} className={`${currentLanguage === 'ar' ? 'pr-10' : 'pl-10'} w-full`} value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} disabled={isLoading}/>
                  </div>
                  <div>
                    <Label htmlFor="filter-category" className="text-xs text-muted-foreground block mb-1">{T.filterByCategoryLabel}</Label>
                    <Select value={selectedCategoryFilter} onValueChange={(value) => {setSelectedCategoryFilter(value); setCurrentPage(1);}} dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'} disabled={isLoading}>
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
            <TabsTrigger value="books">{T.allBooksTab}</TabsTrigger>
            <TabsTrigger value="collections">{T.collectionsTab}</TabsTrigger>
          </TabsList>
        </div>

        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">{T.loadingData}</p>
          </div>
        ) : (
          <div className="pb-10">
            <TabsContent value="books" className="mt-0 outline-none ring-0 focus:ring-0 focus-visible:ring-0">
              {viewMode === 'books' && (
                paginatedItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                    {paginatedItems.map(res => renderBookCard(res as Resource))}
                  </div>
                ) : (
                  !isLoading && <p className="text-center text-muted-foreground py-12">{T.noBooksFound}</p>
                )
              )}
            </TabsContent>
            <TabsContent value="collections" className="mt-0 outline-none ring-0 focus:ring-0 focus-visible:ring-0">
              {viewMode === 'collections' && (
                  paginatedItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                      {paginatedItems.map(col => renderCollectionCard(col as Collection))}
                    </div>
                  ) : (
                    !isLoading && <p className="text-center text-muted-foreground py-12">{T.noCollectionsFound}</p>
                  )
              )}
            </TabsContent>

            {totalItems > 0 && totalPages > 1 && (
              <div className="flex items-center justify-center space-x-4 rtl:space-x-reverse mt-10">
                <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                  variant="outline"
                >
                  <ArrowLeft className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                  {T.previousPage}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {T.pageIndicator(currentPage, totalPages)}
                </span>
                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoading}
                  variant="outline"
                >
                  {T.nextPage}
                  <ArrowRight className={`${currentLanguage === 'ar' ? 'mr-2' : 'ml-2'} h-4 w-4`} />
                </Button>
              </div>
            )}
          </div>
        )}
      </Tabs>
    </div>
  );
}

