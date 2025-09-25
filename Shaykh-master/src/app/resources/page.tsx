
"use client";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, ExternalLink, FileText, CassetteTape, MonitorPlay, ImageIcon as ImageIconLucide, PackageIcon as DefaultResourceIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Resource } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";
import NextImage from "next/image";
import { Badge } from "@/components/ui/badge";

// Public-facing resource types list for filtering
const resourceTypesList = [
  { value: "all", label: { en: "All Types", ar: "كل الأنواع" } },
  { value: "pdf", label: { en: "PDF", ar: "ملف PDF" }, icon: FileText },
  { value: "audio", label: { en: "Audio", ar: "ملف صوتي" }, icon: CassetteTape },
  { value: "video", label: { en: "Video", ar: "ملف فيديو" }, icon: MonitorPlay },
  { value: "article", label: { en: "Article/Text", ar: "مقالة/نص" }, icon: FileText },
  { value: "image", label: { en: "Image", ar: "صورة" }, icon: ImageIconLucide },
  { value: "other", label: { en: "Other", ar: "أخرى" }, icon: DefaultResourceIcon },
];

// Public-facing fixed categories list for filtering
const publicResourceCategories = [
  { value: "all", label: { en: "All Categories", ar: "كل الفئات" } },
  { value: "aqidah", label: { en: "ʿAqīdah", ar: "عقيدة" } },
  { value: "ahadith", label: { en: "Aḥadīth", ar: "أحاديث" } },
  { value: "family", label: { en: "Family", ar: "الأسرة" } },
  { value: "business", label: { en: "Business", ar: "المعاملات" } },
  { value: "prayer", label: { en: "Prayer", ar: "الصلاة" } },
];

// Public-facing languages list for filtering
const resourceLanguagesList = [
  { value: "all", label: { en: "All Languages", ar: "كل اللغات" } },
  { value: "ar", label: { en: "Arabic", ar: "العربية" } },
  { value: "en", label: { en: "English", ar: "الإنجليزية" } },
  // { value: "ur", label: { en: "Urdu", ar: "الأردية" } }, // Urdu removed
];


export default function ResourcesPage() {
  const { currentLanguage } = useLanguage();
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLanguageFilter, setSelectedLanguageFilter] = useState<string>("all");

  const { toast } = useToast();

  const pageTextDefinitions = useMemo(() => ({
    en: {
      pageTitle: "Resources Library",
      pageSubtitle: "Explore scholarly articles, books, lectures, and more.",
      searchPlaceholder: "Search by title, description, or tags...",
      filterByTypeLabel: "Filter by Type",
      filterByCategoryLabel: "Filter by Category",
      filterByLanguageLabel: "Filter by Language",
      typeLabel: "Type",
      languageLabel: "Language",
      categoryLabel: "Category",
      tagsLabel: "Tags",
      viewButton: "View",
      downloadButton: "Download",
      openLinkButton: "Open Link",
      viewPdfButton: "View PDF",
      listenAudioButton: "Listen Audio",
      watchVideoButton: "Watch Video",
      noResourcesFound: "No resources found matching your criteria.",
      loadingResources: "Loading resources...",
      loadError: "Failed to load resources. Please try again.",
      coverImageAlt: "Cover image for",
      resourceIconAlt: "Resource type icon",
      noDescription: "No description available.",
    },
    ar: {
      pageTitle: "مكتبة الموارد",
      pageSubtitle: "اكتشف المقالات العلمية، الكتب، المحاضرات، وغيرها.",
      searchPlaceholder: "ابحث بالعنوان، الوصف، أو الوسوم...",
      filterByTypeLabel: "تصفية حسب النوع",
      filterByCategoryLabel: "تصفية حسب الفئة",
      filterByLanguageLabel: "تصفية حسب اللغة",
      typeLabel: "النوع",
      languageLabel: "اللغة",
      categoryLabel: "الفئة",
      tagsLabel: "الوسوم",
      viewButton: "عرض",
      downloadButton: "تحميل",
      openLinkButton: "فتح الرابط",
      viewPdfButton: "عرض PDF",
      listenAudioButton: "استماع للصوت",
      watchVideoButton: "مشاهدة الفيديو",
      noResourcesFound: "لم يتم العثور على موارد تطابق معايير البحث.",
      loadingResources: "جارٍ تحميل الموارد...",
      loadError: "فشل تحميل الموارد. يرجى المحاولة مرة أخرى.",
      coverImageAlt: "صورة الغلاف لـ",
      resourceIconAlt: "أيقونة نوع المورد",
      noDescription: "لا يوجد وصف متاح.",
    }
  }), []);
  const T = pageTextDefinitions[currentLanguage];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (!supabase) {
          throw new Error("Supabase client is not initialized.");
        }
        const { data, error } = await supabase
          .from('resources')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching resources from Supabase:", JSON.stringify(error, null, 2));
          throw error;
        }
        setAllResources(data || []);
        setFilteredResources(data || []);
      } catch (error: any) {
        toast({ title: T.loadError, description: error.message || "An unknown error occurred", variant: "destructive" });
        setAllResources([]);
        setFilteredResources([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [T.loadError, toast]);

  useEffect(() => {
    let resourcesToFilter = allResources;
    const lowerSearchTerm = searchTerm.toLowerCase();

    if (searchTerm) {
      resourcesToFilter = resourcesToFilter.filter(res =>
        (res.title?.toLowerCase() || '').includes(lowerSearchTerm) ||
        (res.description?.toLowerCase() || '').includes(lowerSearchTerm) ||
        (res.tags?.some(tag => tag.toLowerCase().includes(lowerSearchTerm)))
      );
    }

    if (selectedType !== "all") {
      resourcesToFilter = resourcesToFilter.filter(res => res.type === selectedType);
    }
    if (selectedCategory !== "all") {
      resourcesToFilter = resourcesToFilter.filter(res => res.category === selectedCategory);
    }
    if (selectedLanguageFilter !== "all") {
      resourcesToFilter = resourcesToFilter.filter(res => res.language === selectedLanguageFilter);
    }
    setFilteredResources(resourcesToFilter);
  }, [searchTerm, selectedType, selectedCategory, selectedLanguageFilter, allResources]);

  const getResourceIcon = (type: string) => {
    const resourceTypeInfo = resourceTypesList.find(rt => rt.value === type);
    const IconComponent = resourceTypeInfo?.icon || DefaultResourceIcon;
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


  return (
    <div className="space-y-8 w-full" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <header className="text-center py-8">
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4 font-headline">
          {T.pageTitle}
        </h1>
        <p className="text-lg text-muted-foreground">
          {T.pageSubtitle}
        </p>
      </header>

      <Card className="mb-6 p-4 md:p-6 border rounded-lg shadow-sm bg-card">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="relative lg:col-span-2">
                <Label htmlFor="search-resources" className="sr-only">{T.searchPlaceholder}</Label>
                <Search className={`absolute top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground ${currentLanguage === 'ar' ? 'right-3' : 'left-3'}`} />
                <Input
                  id="search-resources"
                  type="search"
                  placeholder={T.searchPlaceholder}
                  className={`${currentLanguage === 'ar' ? 'pr-10' : 'pl-10'} w-full`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="filter-type" className="text-xs text-muted-foreground block mb-1">{T.filterByTypeLabel}</Label>
                <Select value={selectedType} onValueChange={setSelectedType} dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'} disabled={isLoading}>
                  <SelectTrigger id="filter-type" className="w-full">
                    <SelectValue placeholder={T.filterByTypeLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    {resourceTypesList.map(rt => (
                      <SelectItem key={rt.value} value={rt.value}>
                          {rt.label[currentLanguage]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filter-category" className="text-xs text-muted-foreground block mb-1">{T.filterByCategoryLabel}</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory} dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'} disabled={isLoading}>
                  <SelectTrigger id="filter-category" className="w-full">
                    <SelectValue placeholder={T.filterByCategoryLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    {publicResourceCategories.map(rc => (
                      <SelectItem key={rc.value} value={rc.value}>
                          {rc.label[currentLanguage]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
               <div>
                <Label htmlFor="filter-language" className="text-xs text-muted-foreground block mb-1">{T.filterByLanguageLabel}</Label>
                <Select value={selectedLanguageFilter} onValueChange={setSelectedLanguageFilter} dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'} disabled={isLoading}>
                  <SelectTrigger id="filter-language" className="w-full">
                    <SelectValue placeholder={T.filterByLanguageLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    {resourceLanguagesList.map(rl => (
                      <SelectItem key={rl.value} value={rl.value}>
                          {rl.label[currentLanguage]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
          </div>
      </Card>

      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">{T.loadingResources}</p>
        </div>
      ) : filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {filteredResources.map((res) => (
            <Card key={res.id} className="flex flex-col overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 rounded-lg bg-card h-full">
              <CardHeader className="p-0 relative aspect-[3/4] bg-muted">
                {res.cover_image_url ? (
                  <NextImage
                    key={res.cover_image_url}
                    src={res.cover_image_url}
                    alt={`${T.coverImageAlt} ${res.title}`}
                    layout="fill"
                    objectFit="cover" 
                    data-ai-hint="resource cover"
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
                    {getResourceIcon(res.type)}
                </div>
              </CardHeader>
              <CardContent className="flex-grow p-4 space-y-2">
                <CardTitle className="text-xl font-semibold text-primary font-headline line-clamp-2 leading-tight" title={res.title}>{res.title}</CardTitle>
                <CardDescription className="text-sm text-foreground/75 line-clamp-3 leading-snug mb-1">
                  {res.description || T.noDescription}
                </CardDescription>
                 <div className="text-sm space-y-1 pt-2 border-t border-muted-foreground/10 mt-2">
                    <p><strong className="font-medium text-muted-foreground">{T.typeLabel}:</strong> {resourceTypesList.find(rt => rt.value === res.type)?.label[currentLanguage] || res.type}</p>
                    <p><strong className="font-medium text-muted-foreground">{T.categoryLabel}:</strong> {publicResourceCategories.find(rc => rc.value === res.category)?.label[currentLanguage] || res.category}</p>
                    <p><strong className="font-medium text-muted-foreground">{T.languageLabel}:</strong> {resourceLanguagesList.find(rl => rl.value === res.language)?.label[currentLanguage] || res.language}</p>
                 </div>
                 {res.tags && res.tags.length > 0 && (
                    <div className="pt-2 border-t border-muted-foreground/10 mt-2">
                        <p className="text-sm font-medium text-muted-foreground mb-1.5">{T.tagsLabel}:</p>
                        <div className="flex flex-wrap gap-1.5">
                            {res.tags.slice(0, 5).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs font-normal bg-accent/10 text-accent-foreground/80 border-accent/30">
                                    {tag}
                                </Badge>
                            ))}
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
                    <ExternalLink className={`${currentLanguage === 'ar' ? 'ml-2 h-4 w-4' : 'mr-2 h-4 w-4'}`} />
                    {res.type === 'pdf' ? T.viewPdfButton :
                     (res.type === 'audio' && !getAudioFileType(res.url)) ? T.listenAudioButton : 
                     res.type === 'video' ? T.watchVideoButton :
                     T.openLinkButton}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
         <p className="text-center text-muted-foreground py-12">{T.noResourcesFound}</p>
      )}
    </div>
  );
}


