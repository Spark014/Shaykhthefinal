"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { auth, isFirebaseConfigValid, firebaseInitializationError } from "@/lib/firebase";
import { supabase, clientInitializationError as supabaseClientError } from "@/lib/supabase";
import { Loader2, PlusCircle, Trash2, Library, UploadCloud, ArrowLeft, Edit3, Search as SearchIcon, Book, Music, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import type { Collection } from "@/types/database";
import NextImage from "next/image";
import { isValidHttpUrl } from "@/lib/utils";

// Reusing existing category and language constants for collections for now
const resourceLanguages = [
  { value: "ar", label: { en: "Arabic", ar: "العربية" } },
  { value: "en", label: { en: "English", ar: "الإنجليزية" } },
];

const adminResourceCategories = [
  { value: "aqidah", label: { en: "ʿAqīdah", ar: "عقيدة" } },
  { value: "ahadith", label: { en: "Aḥadīth", ar: "أحاديث" } },
  { value: "quran", label: { en: "Qur'an", ar: "القرآن" } },
  { value: "fiqh", label: { en: "Fiqh", ar: "الفقه" } },
  { value: "family", label: { en: "Family", ar: "الأسرة" } },
  { value: "business", label: { en: "Business", ar: "المعاملات" } },
  { value: "prayer", label: { en: "Prayer", ar: "الصلاة" } },
];

const collectionContentTypes = [
    { value: "book", label: { en: "Book Collection", ar: "مجموعة كتب" }, icon: Book },
    { value: "audio", label: { en: "Audio Collection", ar: "مجموعة صوتيات" }, icon: Music },
    // { value: "video", label: { en: "Video Collection", ar: "مجموعة مرئيات" } },
];

interface CollectionFormData {
  name: string;
  description: string;
  cover_image_url: string;
  language: string;
  category: string;
  collection_content_type: 'book' | 'audio' | 'video' | null;
}

const initialCollectionFormData: CollectionFormData = {
  name: "",
  description: "",
  cover_image_url: "",
  language: resourceLanguages[0]?.value || "",
  category: adminResourceCategories[0]?.value || "",
  collection_content_type: collectionContentTypes[0]?.value as 'book' | 'audio' | 'video' || null,
};

export default function ManageCollectionsPage() {
  const { currentLanguage } = useLanguage();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [currentCollection, setCurrentCollection] = useState<Collection | null>(null);
  const [formData, setFormData] = useState<CollectionFormData>(initialCollectionFormData);
  const [coverPreviewError, setCoverPreviewError] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [overallError, setOverallError] = useState<string | null>(null);

  const { toast } = useToast();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

   useEffect(() => {
    let errorMsg = "";
    if (!isFirebaseConfigValid && firebaseInitializationError) {
        errorMsg += `Firebase Error: ${firebaseInitializationError}. `;
    }
    if (supabaseClientError) { // Check error from Supabase client lib
         errorMsg += `Supabase Client Error: ${supabaseClientError}. `;
    }
    if(errorMsg) {
        setOverallError(errorMsg + "Collection management functionality might be affected.");
        setIsLoading(false); // Stop main loading if fundamental config error
    }
  }, []);

  const pageTextDefinitions = useMemo(() => ({
    en: {
      pageTitle: "Manage Collections",
      pageDescription: "Create, view, edit, and delete collections of resources.",
      addNewButton: "Add New Collection",
      searchPlaceholder: "Search by name or description...",
      noCollections: "No collections found. Add some to get started!",
      noFilteredCollections: "No collections found matching your search.",
      loadError: "Failed to load collections.",
      nameHeader: "Name",
      contentTypeHeader: "Content Type",
      categoryHeader: "Category",
      langHeader: "Language",
      actionsHeader: "Actions",
      addModalTitle: "Add New Collection",
      editModalTitle: "Edit Collection",
      nameLabel: "Collection Name",
      descriptionLabel: "Description (Optional)",
      coverImageUrlLabel: "Cover Image URL (Optional)",
      coverImageUrlPlaceholder: "https://example.com/cover.jpg",
      languageLabel: "Language (for collection metadata)",
      categoryLabel: "Category (for collection type)",
      contentTypeLabel: "Collection Content Type",
      submitButton: "Submit Collection",
      updateButton: "Update Collection",
      submittingButton: "Submitting...",
      addSuccessToast: "Collection added successfully.",
      updateSuccessToast: "Collection updated successfully.",
      errorToastTitle: "Error",
      deleteConfirmTitle: "Confirm Deletion",
      deleteConfirmMessage: (name: string) => `Are you sure you want to delete the collection "${name}"? This will unlink resources from it but will not delete the resources themselves. This action cannot be undone.`,
      deleteButton: "Delete",
      cancelButton: "Cancel",
      deleteSuccessToast: "Collection deleted successfully.",
      backToDashboard: "Back to Dashboard",
      selectPlaceholder: "Select...",
      coverPreviewErrorText: "Cover image failed to load. Check URL.",
      uniqueConstraintError: "A collection with this name, content type, and category already exists.",
      contentTypeRequiredError: "Collection Content Type is required.",
      invalidCoverUrlError: "Invalid Cover Image URL. Please enter a valid link starting with http:// or https://.",
      apiError: "An API error occurred.",
      authenticationError: "Authentication Error",
      userNotAuthenticated: "User not authenticated for this operation.",
      failedToGetToken: "Failed to get Firebase ID token for API request.",
      configErrorWarning: "Warning: There are issues with Firebase or Supabase configuration. Functionality may be limited.",
    },
    ar: {
      pageTitle: "إدارة المجموعات",
      pageDescription: "إنشاء وعرض وتعديل وحذف مجموعات الموارد.",
      addNewButton: "إضافة مجموعة جديدة",
      searchPlaceholder: "ابحث بالاسم أو الوصف...",
      noCollections: "لم يتم العثور على مجموعات. ابدأ بإضافة البعض!",
      noFilteredCollections: "لم يتم العثور على مجموعات تطابق بحثك.",
      loadError: "فشل تحميل المجموعات.",
      nameHeader: "الاسم",
      contentTypeHeader: "نوع المحتوى",
      categoryHeader: "الفئة",
      langHeader: "اللغة",
      actionsHeader: "الإجراءات",
      addModalTitle: "إضافة مجموعة جديدة",
      editModalTitle: "تعديل المجموعة",
      nameLabel: "اسم المجموعة",
      descriptionLabel: "الوصف (اختياري)",
      coverImageUrlLabel: "رابط صورة الغلاف (اختياري)",
      coverImageUrlPlaceholder: "https://example.com/cover.jpg",
      languageLabel: "اللغة (لبيانات المجموعة الوصفية)",
      categoryLabel: "الفئة (لنوع المجموعة)",
      contentTypeLabel: "نوع محتوى المجموعة",
      submitButton: "إرسال المجموعة",
      updateButton: "تحديث المجموعة",
      submittingButton: "جارٍ الإرسال...",
      addSuccessToast: "تمت إضافة المجموعة بنجاح.",
      updateSuccessToast: "تم تحديث المجموعة بنجاح.",
      errorToastTitle: "خطأ",
      deleteConfirmTitle: "تأكيد الحذف",
      deleteConfirmMessage: (name: string) => `هل أنت متأكد أنك تريد حذف المجموعة "${name}"؟ سيؤدي هذا إلى فك ارتباط الموارد بها ولكنه لن يحذف الموارد نفسها. لا يمكن التراجع عن هذا الإجراء.`,
      deleteButton: "حذف",
      cancelButton: "إلغاء",
      deleteSuccessToast: "تم حذف المجموعة بنجاح.",
      backToDashboard: "العودة إلى لوحة التحكم",
      selectPlaceholder: "اختر...",
      coverPreviewErrorText: "فشل تحميل صورة الغلاف. تحقق من الرابط.",
      uniqueConstraintError: "توجد مجموعة بهذا الاسم ونوع المحتوى والفئة بالفعل.",
      contentTypeRequiredError: "نوع محتوى المجموعة مطلوب.",
      invalidCoverUrlError: "رابط صورة الغلاف غير صالح. يرجى إدخال رابط صحيح يبدأ بـ http:// أو https://.",
      apiError: "حدث خطأ في واجهة برمجة التطبيقات.",
      authenticationError: "خطأ في المصادقة",
      userNotAuthenticated: "المستخدم غير مصادق عليه لهذه العملية.",
      failedToGetToken: "فشل في الحصول على رمز Firebase ID لطلب الواجهة البرمجية.",
      configErrorWarning: "تحذير: توجد مشكلات في تكوين Firebase أو Supabase. قد تكون الوظائف محدودة.",
    }
  }), [currentLanguage]);
  const T = pageTextDefinitions[currentLanguage];

  const fetchCollections = useCallback(async () => {
    if (overallError || !supabase) {
      setIsLoading(false);
      if (!overallError && !supabase) toast({ title: T.errorToastTitle, description: "Supabase client not initialized for fetching data.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setCollections(data || []);
      setFilteredCollections(data || []);
    } catch (error: any) {
      toast({ title: T.loadError, description: error.message, variant: "destructive" });
      setCollections([]);
      setFilteredCollections([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, T, toast, overallError]);

  useEffect(() => {
    if (!auth) {
      setOverallError(prev => (prev ? prev + " Firebase auth not initialized." : "Firebase auth not initialized."));
      setIsLoading(false);
      router.replace('/admin/login'); // Critical auth error, redirect
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        if (!overallError) fetchCollections();
      } else {
        setCurrentUser(null);
        router.replace('/admin/login');
      }
    });
    return () => {
      unsubscribeAuth();
    };
  }, [router, fetchCollections, overallError]);
  
  useEffect(() => {
    let collectionsToFilter = collections;
    const lowerSearchTerm = searchTerm.toLowerCase();

    if (searchTerm) {
        collectionsToFilter = collectionsToFilter.filter(col =>
        (col.name?.toLowerCase() || '').includes(lowerSearchTerm) ||
        (col.description?.toLowerCase() || '').includes(lowerSearchTerm)
      );
    }
    setFilteredCollections(collectionsToFilter);
  }, [searchTerm, collections]);


  const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === "cover_image_url") setCoverPreviewError(false);
  };

  const handleSelectChange = (name: keyof CollectionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value as any }));
  };

  const resetForm = () => {
    setFormData(initialCollectionFormData);
    setCurrentCollection(null);
    setCoverPreviewError(false);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogMode('add');
    setIsDialogOpen(true);
  };

  const openEditDialog = (collection: Collection) => {
    setCurrentCollection(collection);
    setFormData({
      name: collection.name,
      description: collection.description || "",
      cover_image_url: collection.cover_image_url || "",
      language: collection.language || resourceLanguages[0]?.value || "",
      category: collection.category || adminResourceCategories[0]?.value || "",
      collection_content_type: collection.collection_content_type as 'book' | 'audio' | 'video' || collectionContentTypes[0]?.value as 'book' | 'audio' | 'video' || null,
    });
    setDialogMode('edit');
    setCoverPreviewError(false);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (overallError) {
      toast({ title: T.errorToastTitle, description: T.configErrorWarning, variant: "destructive" });
      return;
    }
    if (!formData.name) {
      toast({ title: T.errorToastTitle, description: "Collection name is required.", variant: "destructive" });
      return;
    }
    if (!formData.collection_content_type) {
      toast({ title: T.errorToastTitle, description: T.contentTypeRequiredError, variant: "destructive" });
      return;
    }
    if (formData.cover_image_url && !isValidHttpUrl(formData.cover_image_url)) {
      toast({ title: T.errorToastTitle, description: T.invalidCoverUrlError, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    if (!currentUser) {
        toast({ title: T.authenticationError, description: T.userNotAuthenticated, variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    try {
      const token = await currentUser.getIdToken();
      if (!token) {
        toast({ title: T.authenticationError, description: T.failedToGetToken, variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      const dataToSend: Partial<CollectionFormData> = {
        name: formData.name,
        description: formData.description || undefined,
        cover_image_url: formData.cover_image_url || undefined,
        language: formData.language || undefined,
        category: formData.category || undefined,
        collection_content_type: formData.collection_content_type,
      };

      let response;
      if (dialogMode === 'add') {
        response = await fetch('/api/admin/collections', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSend),
        });
      } else if (currentCollection) {
        const changedData: Partial<CollectionFormData> = {};
        (Object.keys(formData) as Array<keyof CollectionFormData>).forEach(key => {
          const oldValue = currentCollection[key] ?? "";
          const newValue = formData[key] ?? "";
          if (newValue !== oldValue) {
            if ((key === "cover_image_url" || key === "description") && newValue === "") {
              changedData[key] = undefined as any;
            } else if (key === "collection_content_type") {
              // Only assign if not null
              if (formData.collection_content_type) {
                changedData[key] = formData.collection_content_type;
              }
            } else {
              changedData[key] = formData[key] as any;
            }
          }
        });
        // Always include name if not present (for PATCH safety)
        if (!changedData.name && formData.name) changedData.name = formData.name;

        response = await fetch(`/api/admin/collections/${currentCollection.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(Object.keys(changedData).length > 0 ? changedData : { name: formData.name }),
        });
      } else {
        throw new Error("Invalid dialog mode or missing collection for update.");
      }
      
      const responseData = await response.json();

      if (!response.ok) {
          let description = responseData.error || T.apiError;
          if (response.status === 409) { // API explicitly returns 409 for unique constraint
            description = responseData.error || T.uniqueConstraintError;
          } else if (responseData.issues) { // Zod validation issues
            description = Object.values(responseData.issues).flat().join(' ');
          }
          throw new Error(description);
      }

      toast({ title: "Success", description: dialogMode === 'add' ? T.addSuccessToast : T.updateSuccessToast });
      setIsDialogOpen(false);
      fetchCollections();

    } catch (err: any) {
      let description = err.message || T.apiError;
      toast({ title: T.errorToastTitle, description: description, variant: "destructive", duration: 9000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = (collection: Collection) => {
    setCollectionToDelete(collection);
  };

  const handleDelete = async () => {
    if (overallError) {
      toast({ title: T.errorToastTitle, description: T.configErrorWarning, variant: "destructive" });
      return;
    }
    if (!collectionToDelete || !currentUser) {
        toast({ title: T.errorToastTitle, description: !currentUser ? T.userNotAuthenticated : "No collection selected for deletion.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
      const token = await currentUser.getIdToken();
      if (!token) {
        toast({ title: T.authenticationError, description: T.failedToGetToken, variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`/api/admin/collections/${collectionToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: T.apiError }));
        throw new Error(errorData.error || `Failed to delete collection (HTTP ${response.status})`);
      }

      toast({ title: "Success", description: T.deleteSuccessToast });
      setCollectionToDelete(null);
      fetchCollections(); 
    } catch (error: any) {
      toast({ title: T.errorToastTitle, description: error.message || T.apiError, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !currentUser && !overallError) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-2 sm:px-4 py-4 space-y-6" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <header className="text-center px-2">
        <Library className="mx-auto h-14 w-14 text-primary mb-2" />
        <h1 className="text-2xl md:text-4xl font-bold text-primary mb-1 font-headline">{T.pageTitle}</h1>
        <p className="text-base text-muted-foreground">{T.pageDescription}</p>
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

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <Button onClick={openAddDialog} disabled={isSubmitting || !!overallError}>
          <PlusCircle className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} /> {T.addNewButton}
        </Button>
         <div className="relative w-full sm:w-auto sm:max-w-xs">
            <SearchIcon className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground ${currentLanguage === 'ar' ? 'right-3' : 'left-3'}`} />
            <Input
                type="search"
                placeholder={T.searchPlaceholder}
                className={`${currentLanguage === 'ar' ? 'pr-10' : 'pl-10'} w-full`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading || !!overallError}
            />
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/dashboard">
            <ArrowLeft className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} /> {T.backToDashboard}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>{T.pageTitle}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : collections.length === 0 && !overallError ? (
            <p className="text-center text-muted-foreground py-10">{T.noCollections}</p>
          ) : filteredCollections.length === 0 && searchTerm && !overallError ? (
             <p className="text-center text-muted-foreground py-10">{T.noFilteredCollections}</p>
          ) : !overallError ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{T.nameHeader}</TableHead>
                    <TableHead>{T.contentTypeHeader}</TableHead>
                    <TableHead>{T.categoryHeader}</TableHead>
                    <TableHead>{T.langHeader}</TableHead>
                    <TableHead className="text-right">{T.actionsHeader}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCollections.map((col) => (
                    <TableRow key={col.id}>
                      <TableCell className="font-medium max-w-xs truncate" title={col.name}>{col.name}</TableCell>
                      <TableCell>{collectionContentTypes.find(ct => ct.value === col.collection_content_type)?.label[currentLanguage] || col.collection_content_type || 'N/A'}</TableCell>
                      <TableCell>{adminResourceCategories.find(rc => rc.value === col.category)?.label[currentLanguage] || col.category || 'N/A'}</TableCell>
                      <TableCell>{resourceLanguages.find(rl => rl.value === col.language)?.label[currentLanguage] || col.language || 'N/A'}</TableCell>
                      <TableCell className="text-right space-x-1 rtl:space-x-reverse">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(col)} disabled={isSubmitting || !!overallError} title="Edit">
                          <Edit3 className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(col)} disabled={isSubmitting || !!overallError} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null }
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { setIsDialogOpen(isOpen); if (!isOpen) resetForm(); }}>
        <DialogContent className="sm:max-w-[600px]" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'add' ? T.addModalTitle : T.editModalTitle}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-1">
              <Label htmlFor="name-modal">{T.nameLabel}</Label>
              <Input id="name-modal" name="name" value={formData.name} onChange={handleFormInputChange} dir={currentLanguage === 'ar' && formData.language === 'ar' ? 'rtl' : 'ltr'} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="collection_content_type-modal">{T.contentTypeLabel}</Label>
              <Select value={formData.collection_content_type || ""} onValueChange={(value) => handleSelectChange('collection_content_type', value)}>
                  <SelectTrigger id="collection_content_type-modal"><SelectValue placeholder={T.selectPlaceholder} /></SelectTrigger>
                  <SelectContent>
                      {collectionContentTypes.map(ct => <SelectItem key={ct.value} value={ct.value}>{ct.label[currentLanguage]}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="description-modal">{T.descriptionLabel}</Label>
              <Textarea id="description-modal" name="description" value={formData.description} onChange={handleFormInputChange} dir={currentLanguage === 'ar' && formData.language === 'ar' ? 'rtl' : 'ltr'} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cover_image_url-modal">{T.coverImageUrlLabel}</Label>
              <Input id="cover_image_url-modal" name="cover_image_url" type="url" placeholder={T.coverImageUrlPlaceholder} value={formData.cover_image_url} onChange={handleFormInputChange} dir="ltr" />
              {formData.cover_image_url && !coverPreviewError && isValidHttpUrl(formData.cover_image_url) && (
                <div className="mt-2 rounded border p-2 flex justify-center">
                  <NextImage key={formData.cover_image_url} src={formData.cover_image_url} alt="Cover preview" width={100} height={150} className="object-contain" onError={() => setCoverPreviewError(true)} data-ai-hint="collection cover" />
                </div>
              )}
              {coverPreviewError && formData.cover_image_url && (
                 <div className="mt-2 rounded border border-destructive/50 bg-destructive/10 p-2 flex justify-center items-center"><p className="text-xs text-destructive">{T.coverPreviewErrorText}</p></div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="language-modal-coll">{T.languageLabel}</Label>
                  <Select value={formData.language} onValueChange={(value) => handleSelectChange('language', value)}>
                      <SelectTrigger id="language-modal-coll"><SelectValue placeholder={T.selectPlaceholder} /></SelectTrigger>
                      <SelectContent>
                          {resourceLanguages.map(rl => <SelectItem key={rl.value} value={rl.value}>{rl.label[currentLanguage]}</SelectItem>)}
                      </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="category-modal-coll">{T.categoryLabel}</Label>
                  <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
                      <SelectTrigger id="category-modal-coll"><SelectValue placeholder={T.selectPlaceholder} /></SelectTrigger>
                      <SelectContent>
                          {adminResourceCategories.map(rc => <SelectItem key={rc.value} value={rc.value}>{rc.label[currentLanguage]}</SelectItem>)}
                      </SelectContent>
                  </Select>
                </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" onClick={resetForm}>{T.cancelButton}</Button></DialogClose>
            <Button onClick={handleSubmit} disabled={isSubmitting || !formData.name || !formData.collection_content_type || !!overallError}>
              {isSubmitting ? <Loader2 className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4 animate-spin`} /> : <UploadCloud className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} />}
              {dialogMode === 'add' ? T.submitButton : T.updateButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!collectionToDelete} onOpenChange={() => setCollectionToDelete(null)}>
        <DialogContent dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{T.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>{T.deleteConfirmMessage(collectionToDelete?.name || "")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectionToDelete(null)}>{T.cancelButton}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting || !!overallError}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {T.deleteButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}