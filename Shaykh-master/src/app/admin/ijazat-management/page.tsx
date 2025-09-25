"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Loader2, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Ijaza {
  id: string;
  title: { en: string; ar: string };
  issuer: { en: string; ar: string };
  year: string;
  description: { en: string; ar: string };
  pdf_url: string;
  category: string;
}

const IJAZA_CATEGORIES = [
  "Hadith",
  "Fiqh",
  "Aqeedah",
  "Quran",
  "Usool",
  "Other"
];

export default function IjazatManagementPage() {
  const { currentLanguage } = useLanguage();
  const { toast } = useToast();
  const [ijazat, setIjazat] = useState<Ijaza[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [newIjaza, setNewIjaza] = useState<Partial<Ijaza>>({
    title: { en: "", ar: "" },
    issuer: { en: "", ar: "" },
    year: "",
    description: { en: "", ar: "" },
    category: ""
  });

  useEffect(() => {
    fetchIjazat();
  }, []);

  async function fetchIjazat() {
    try {
      setLoading(true);
      setError(null); // Reset error state on new fetch attempt
      
      // Step 1: Check if Supabase client is initialized
      if (!supabase) {
        const error = new Error('Database client is not initialized');
        console.error('Supabase initialization error:', error);
        setError({
          title: 'Connection Error',
          message: 'Unable to connect to the database. Please check your connection settings.'
        });
        return;
      }

      // Step 2: Check database connection
      try {
        const { error: pingError } = await supabase.from('_dummy').select('*').limit(1).single();
        if (pingError && !pingError.message.includes('_dummy')) {
          console.error('Database connection error:', pingError);
          toast({
            title: 'Connection Error',
            description: 'Unable to connect to the database. Please check your network connection.',
            variant: 'destructive',
            duration: 10000,
          });
          setIjazat([]);
          return;
        }
      } catch (pingError) {
        // Ignore table not found error as we expect this
      }

      // Step 3: Verify authentication
      const { data: session, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('Authentication error:', authError);
        setError({
          title: 'Authentication Error',
          message: 'Your session may have expired. Please log in again.'
        });
        setIjazat([]);
        return;
      }

      // Step 4: Check if table exists
      const { error: schemaError } = await supabase
        .from('ijazat')
        .select('id')
        .limit(1);

      if (schemaError) {
        console.error('Database schema error:', schemaError);
        
        // Handle specific error cases
        if (schemaError.code === '42P01') { // Table doesn't exist
          setError({
            title: 'Database Setup Required',
            message: 'The ijazat table needs to be created. Please check the console for setup instructions.'
          });
          console.info(`
=== Database Setup Instructions ===
Execute these SQL commands in your Supabase SQL editor:

1. Create the ijazat table:
CREATE TABLE public.ijazat (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title JSONB NOT NULL,
    issuer JSONB NOT NULL,
    year TEXT NOT NULL,
    description JSONB NOT NULL,
    pdf_url TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

2. Enable Row Level Security:
ALTER TABLE public.ijazat ENABLE ROW LEVEL SECURITY;

3. Set up access policies:
-- Allow public read access
CREATE POLICY "Enable read access for all users" 
ON public.ijazat FOR SELECT USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Enable insert for authenticated users only" 
ON public.ijazat FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete
CREATE POLICY "Enable delete for authenticated users only" 
ON public.ijazat FOR DELETE USING (auth.role() = 'authenticated');

4. Create storage bucket for PDFs:
-- Go to Storage in Supabase Dashboard
-- Create a new bucket named "documents"
-- Set bucket privacy to "public"
-- Add the following storage policies:
   For uploads: auth.role() = 'authenticated'
   For downloads: true
`);
        } else if (schemaError.code === '42501') { // Permission denied
          toast({
            title: 'Permission Error',
            description: 'You do not have permission to access this data. Please check your user role.',
            variant: 'destructive',
            duration: 10000,
          });
        } else {
          toast({
            title: 'Database Error',
            description: `Error accessing database: ${schemaError.message}`,
            variant: 'destructive',
            duration: 10000,
          });
        }
        setIjazat([]);
        return;
      }

      // Step 5: Fetch the actual data
      const { data, error: fetchError } = await supabase
        .from('ijazat')
        .select('*')
        .order('year', { ascending: false });

      if (fetchError) {
        console.error('Data fetch error:', fetchError);
        
        // Handle specific fetch errors
        if (fetchError.code === 'PGRST116') {
          setError({
            title: 'Access Error',
            message: 'The request violates row-level security policies. Please check your permissions.'
          });
        } else if (fetchError.code === '23505') {
          setError({
            title: 'Data Error',
            message: 'A duplicate entry was found. Please check your data.'
          });
        } else {
          setError({
            title: 'Data Fetch Error',
            message: fetchError.message || 'Failed to load ijazat data. Please try again.'
          });
        }
        setIjazat([]);
        return;
      }

      if (!data) {
        console.warn('No data returned from query');
        setIjazat([]);
        return;
      }
      
      setIjazat(data);
    } catch (error: any) {
      console.error('Unexpected error while fetching ijazat:', error);
      setError({
        title: 'Unexpected Error',
        message: error.message || 'An unexpected error occurred. Please try again.'
      });
      
      console.log(`
=== Database Setup Instructions ===

1. Create the ijazat table:

CREATE TABLE ijazat (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title JSONB NOT NULL,
  issuer JSONB NOT NULL,
  year TEXT NOT NULL,
  description JSONB NOT NULL,
  pdf_url TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

2. Set up table policies:

CREATE POLICY "Enable read access for all users" ON "public"."ijazat"
FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."ijazat"
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON "public"."ijazat"
FOR DELETE USING (auth.role() = 'authenticated');

3. Enable Row Level Security:

ALTER TABLE ijazat ENABLE ROW LEVEL SECURITY;

4. Create storage bucket:

-- In Supabase Dashboard:
1. Go to Storage
2. Create a new bucket named "documents"
3. Set the following CORS configuration:
{
  "cors_rules": [
    {
      "allowed_origins": ["*"],
      "allowed_methods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
      "allowed_headers": ["*"],
      "max_age_seconds": 3600
    }
  ]
}
4. Set bucket privacy to "public"
5. Create policy for authenticated uploads:
   - Type: INSERT
   - Name: "Enable uploads for authenticated users"
   - USING: ((auth.role() = 'authenticated'::text))
6. Create policy for public downloads:
   - Type: SELECT
   - Name: "Enable downloads for everyone"
   - USING: (true)
`);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized.');
      }
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `ijazat/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setNewIjaza(prev => ({ ...prev, pdf_url: publicUrl }));

      toast({
        title: currentLanguage === 'ar' ? 'تم الرفع بنجاح' : 'Upload Successful',
        description: currentLanguage === 'ar' ? 'تم رفع الملف بنجاح' : 'File has been uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: currentLanguage === 'ar' ? 'خطأ في الرفع' : 'Upload Error',
        description: currentLanguage === 'ar' ? 'حدث خطأ أثناء رفع الملف' : 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newIjaza.pdf_url) {
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: currentLanguage === 'ar' ? 'يرجى رفع ملف الإجازة أولاً' : 'Please upload the Ijaza document first',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized.');
      }
      const { error } = await supabase
        .from('ijazat')
        .insert([newIjaza]);

      if (error) throw error;

      toast({
        title: currentLanguage === 'ar' ? 'تمت الإضافة' : 'Added Successfully',
        description: currentLanguage === 'ar' ? 'تمت إضافة الإجازة بنجاح' : 'Ijaza has been added successfully',
      });

      setNewIjaza({
        title: { en: "", ar: "" },
        issuer: { en: "", ar: "" },
        year: "",
        description: { en: "", ar: "" },
        category: ""
      });
      
      fetchIjazat();
    } catch (error) {
      console.error('Error adding ijaza:', error);
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: currentLanguage === 'ar' ? 'حدث خطأ أثناء إضافة الإجازة' : 'Failed to add ijaza',
        variant: 'destructive',
      });
    }
  }

  async function handleDelete(id: string) {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized.');
      }
      const { error } = await supabase
        .from('ijazat')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: currentLanguage === 'ar' ? 'تم الحذف' : 'Deleted Successfully',
        description: currentLanguage === 'ar' ? 'تم حذف الإجازة بنجاح' : 'Ijaza has been deleted successfully',
      });

      fetchIjazat();
    } catch (error) {
      console.error('Error deleting ijaza:', error);
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: currentLanguage === 'ar' ? 'حدث خطأ أثناء حذف الإجازة' : 'Failed to delete ijaza',
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">{error.title}</CardTitle>
            <CardDescription className="text-red-600">{error.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => {
                setError(null);
                fetchIjazat();
              }}
              variant="outline"
              className="mt-4"
            >
              <Loader2 className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>
            {currentLanguage === 'ar' ? 'إضافة إجازة جديدة' : 'Add New Ijaza'}
          </CardTitle>
          <CardDescription>
            {currentLanguage === 'ar' ? 'أضف إجازة جديدة مع التفاصيل والمستند' : 'Add a new ijaza with details and document'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>English Title</Label>
                  <Input
                    value={newIjaza.title?.en}
                    onChange={e => setNewIjaza(prev => ({
                      ...prev,
                      title: { ...prev.title as any, en: e.target.value }
                    }))}
                    required
                  />
                </div>
                <div>
                  <Label>English Issuer</Label>
                  <Input
                    value={newIjaza.issuer?.en}
                    onChange={e => setNewIjaza(prev => ({
                      ...prev,
                      issuer: { ...prev.issuer as any, en: e.target.value }
                    }))}
                    required
                  />
                </div>
                <div>
                  <Label>English Description</Label>
                  <Textarea
                    value={newIjaza.description?.en}
                    onChange={e => setNewIjaza(prev => ({
                      ...prev,
                      description: { ...prev.description as any, en: e.target.value }
                    }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>العنوان بالعربية</Label>
                  <Input
                    value={newIjaza.title?.ar}
                    onChange={e => setNewIjaza(prev => ({
                      ...prev,
                      title: { ...prev.title as any, ar: e.target.value }
                    }))}
                    required
                    className="text-right"
                  />
                </div>
                <div>
                  <Label>المُجيز بالعربية</Label>
                  <Input
                    value={newIjaza.issuer?.ar}
                    onChange={e => setNewIjaza(prev => ({
                      ...prev,
                      issuer: { ...prev.issuer as any, ar: e.target.value }
                    }))}
                    required
                    className="text-right"
                  />
                </div>
                <div>
                  <Label>الوصف بالعربية</Label>
                  <Textarea
                    value={newIjaza.description?.ar}
                    onChange={e => setNewIjaza(prev => ({
                      ...prev,
                      description: { ...prev.description as any, ar: e.target.value }
                    }))}
                    required
                    className="text-right"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Year</Label>
                <Input
                  value={newIjaza.year}
                  onChange={e => setNewIjaza(prev => ({ ...prev, year: e.target.value }))}
                  required
                  placeholder="e.g., 1435 AH"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={newIjaza.category}
                  onValueChange={value => setNewIjaza(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {IJAZA_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>PDF Document</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  required={!newIjaza.pdf_url}
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            </div>
            <Button type="submit" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              {currentLanguage === 'ar' ? 'إضافة الإجازة' : 'Add Ijaza'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {currentLanguage === 'ar' ? 'إدارة الإجازات' : 'Manage Ijazat'}
          </CardTitle>
          <CardDescription>
            {currentLanguage === 'ar' ? 'عرض وإدارة جميع الإجازات' : 'View and manage all ijazat'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ijazat.map((ijaza) => (
              <Card key={ijaza.id} className="relative">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {ijaza.title[currentLanguage]}
                  </CardTitle>
                  <CardDescription>
                    {ijaza.issuer[currentLanguage]} - {ijaza.year}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {ijaza.description[currentLanguage]}
                  </p>
                  <div className="flex items-center justify-between">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(ijaza.pdf_url, '_blank')}
                    >
                      <ScrollText className="mr-2 h-4 w-4" />
                      {currentLanguage === 'ar' ? 'عرض' : 'View'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {currentLanguage === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {currentLanguage === 'ar' 
                              ? 'هل أنت متأكد من حذف هذه الإجازة؟ لا يمكن التراجع عن هذا الإجراء.'
                              : 'Are you sure you want to delete this ijaza? This action cannot be undone.'}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
                          </AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(ijaza.id)}>
                            {currentLanguage === 'ar' ? 'حذف' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}