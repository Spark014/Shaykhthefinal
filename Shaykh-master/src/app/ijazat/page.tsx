"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useLanguage } from '@/context/LanguageContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, ScrollText, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Ijaza {
  id: string;
  title: { en: string; ar: string };
  issuer: { en: string; ar: string };
  year: string;
  description: { en: string; ar: string };
  pdf_url: string;
  category: string;
}

export default function IjazatPage() {
  const { currentLanguage } = useLanguage();
  const { toast } = useToast();
  const [ijazat, setIjazat] = useState<Ijaza[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIjazat() {
      try {
        const { data, error } = await supabase
          .from('ijazat')
          .select('*')
          .order('year', { ascending: false });

        if (error) throw error;
        setIjazat(data || []);
      } catch (error) {
        console.error('Error fetching ijazat:', error);
        toast({
          title: currentLanguage === 'ar' ? 'خطأ في التحميل' : 'Error Loading',
          description: currentLanguage === 'ar' ? 'حدث خطأ أثناء تحميل الإجازات' : 'Failed to load ijazat',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchIjazat();
  }, [currentLanguage, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className={`text-3xl ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
            {currentLanguage === 'ar' ? 'إجازات الشيخ العلمية' : "Shaykh's Academic Authorizations"}
          </CardTitle>
          <CardDescription className={`text-lg ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
            {currentLanguage === 'ar' 
              ? 'مجموعة الإجازات العلمية التي حصل عليها الشيخ من كبار العلماء'
              : 'Collection of academic authorizations (Ijazat) received by the Shaykh from senior scholars'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] w-full rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
              {ijazat.map((ijaza) => (
                <Card key={ijaza.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Badge variant="secondary" className="mb-2">
                        {ijaza.year}
                      </Badge>
                      {ijaza.category && (
                        <Badge variant="outline">
                          {ijaza.category}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className={`text-xl ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
                      {ijaza.title[currentLanguage]}
                    </CardTitle>
                    <CardDescription className={`${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
                      {ijaza.issuer[currentLanguage]}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-muted-foreground ${currentLanguage === 'ar' ? 'text-right' : 'text-left'} line-clamp-3`}>
                      {ijaza.description[currentLanguage]}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="secondary" 
                      className="w-full" 
                      onClick={() => window.open(ijaza.pdf_url, '_blank')}
                    >
                      <ScrollText className="mr-2 h-4 w-4" />
                      {currentLanguage === 'ar' ? 'عرض الإجازة' : 'View Ijaza'}
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
