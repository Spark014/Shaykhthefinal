"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, BookOpen, Headphones, User, MessageSquareQuote, ExternalLink, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'book' | 'audio' | 'biography' | 'fatawa';
  category?: string;
  language?: string;
  url?: string;
  relevance: number;
}

export default function SearchPage() {
  const { currentLanguage } = useLanguage();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const pageTexts = useMemo(() => ({
    en: {
      title: "Search",
      description: "Search through all content including books, audio lectures, biography, and questions.",
      searchPlaceholder: "Enter your search query...",
      searchButton: "Search",
      noResults: "No results found",
      noResultsDesc: "Try adjusting your search terms or browse our categories.",
      resultsFor: "Results for",
      loading: "Searching...",
      typeLabels: {
        book: "Book",
        audio: "Audio",
        biography: "Biography", 
        fatawa: "Q&A"
      },
      viewDetails: "View Details"
    },
    ar: {
      title: "البحث",
      description: "ابحث في جميع المحتويات بما في ذلك الكتب والمحاضرات الصوتية والسيرة الذاتية والأسئلة.",
      searchPlaceholder: "أدخل استعلام البحث...",
      searchButton: "بحث",
      noResults: "لم يتم العثور على نتائج",
      noResultsDesc: "حاول تعديل مصطلحات البحث أو تصفح فئاتنا.",
      resultsFor: "نتائج البحث عن",
      loading: "جاري البحث...",
      typeLabels: {
        book: "كتاب",
        audio: "صوتيات",
        biography: "السيرة الذاتية",
        fatawa: "سؤال وجواب"
      },
      viewDetails: "عرض التفاصيل"
    }
  }), []);

  const T = pageTexts[currentLanguage];

  const typeIcons = {
    book: BookOpen,
    audio: Headphones,
    biography: User,
    fatawa: MessageSquareQuote
  };

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (query: string = searchQuery) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setHasSearched(true);

    try {
      // Mock search results - in a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

      const mockResults: SearchResult[] = [
        {
          id: "1",
          title: currentLanguage === 'ar' ? "كتاب الطهارة" : "Book of Purification",
          description: currentLanguage === 'ar' ? "شرح أحكام الطهارة والوضوء" : "Explanation of purification and ablution rulings",
          type: "book",
          category: "fiqh",
          language: "ar",
          url: "/library/books",
          relevance: 0.95
        },
        {
          id: "2", 
          title: currentLanguage === 'ar' ? "محاضرة في العقيدة" : "Lecture on Aqidah",
          description: currentLanguage === 'ar' ? "محاضرة مهمة في أصول العقيدة الإسلامية" : "Important lecture on the fundamentals of Islamic belief",
          type: "audio",
          category: "aqidah",
          language: "ar",
          url: "/library/audio",
          relevance: 0.87
        }
      ].filter(result => 
        result.title.toLowerCase().includes(query.toLowerCase()) ||
        result.description.toLowerCase().includes(query.toLowerCase())
      );

      setSearchResults(mockResults);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: currentLanguage === 'ar' ? "خطأ في البحث" : "Search Error",
        description: currentLanguage === 'ar' ? "حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى." : "An error occurred while searching. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const IconComponent = ({ type }: { type: keyof typeof typeIcons }) => {
    const Icon = typeIcons[type];
    return <Icon className="h-5 w-5" />;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{T.title}</h1>
        <p className="text-muted-foreground">{T.description}</p>
      </div>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className={`absolute ${currentLanguage === 'ar' ? 'right-3' : 'left-3'} top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground`} />
            <Input
              type="text"
              placeholder={T.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${currentLanguage === 'ar' ? 'pr-10' : 'pl-10'}`}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" disabled={isLoading || !searchQuery.trim()}>
            {isLoading ? (
              <>
                <Loader2 className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4 animate-spin`} />
                {T.loading}
              </>
            ) : (
              T.searchButton
            )}
          </Button>
        </div>
      </form>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className={`${currentLanguage === 'ar' ? 'mr-3' : 'ml-3'} text-muted-foreground`}>
            {T.loading}
          </span>
        </div>
      )}

      {hasSearched && !isLoading && (
        <>
          {searchResults.length > 0 ? (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">
                {T.resultsFor} "{searchQuery}" ({searchResults.length})
              </h2>
              
              <div className="grid gap-4">
                {searchResults.map((result) => (
                  <Card key={result.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2 flex items-center gap-2">
                            <IconComponent type={result.type} />
                            {result.title}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {result.description}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Badge variant="secondary">
                            {T.typeLabels[result.type]}
                          </Badge>
                          {result.category && (
                            <Badge variant="outline" className="text-xs">
                              {result.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {result.language && (
                            <Badge variant="outline" className="text-xs">
                              {result.language === 'ar' ? 'العربية' : 'English'}
                            </Badge>
                          )}
                        </div>
                        {result.url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={result.url} className="flex items-center gap-2">
                              <ExternalLink className="h-4 w-4" />
                              {T.viewDetails}
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{T.noResults}</h3>
              <p className="text-muted-foreground">{T.noResultsDesc}</p>
            </div>
          )}
        </>
      )}

      {!hasSearched && !initialQuery && (
        <div className="text-center py-12">
          <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{T.description}</p>
        </div>
      )}
    </div>
  );
}
