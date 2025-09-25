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
import { auth, isFirebaseConfigValid, firebaseInitializationError } from "@/lib/firebase"; // Firebase auth instance
import { supabase, clientInitializationError as supabaseClientError } from "@/lib/supabase"; // Supabase client for reads
import { Loader2, PlusCircle, Trash2, Package, UploadCloud, ArrowLeft, ExternalLink, Search as SearchIcon, Edit3, Info, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import type { Resource, Collection } from "@/types/database";
import NextImage from "next/image";
import { isValidHttpUrl } from "@/lib/utils";

const resourceTypes = [
  { value: "pdf", label: { en: "PDF", ar: "ملف PDF" } },
  { value: "audio", label: { en: "Audio", ar: "ملف صوتي" } },
  { value: "video", label: { en: "Video", ar: "ملف فيديو" } },
  { value: "article", label: { en: "Article/Text", ar: "مقالة/نص" } },
  { value: "image", label: { en: "Image", ar: "صورة" } },
  { value: "other", label: { en: "Other", ar: "أخرى" } },
];

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

interface ResourceFormData {
  title: string;
  description: string;
  type: string;
  language: string; 
  category: string; 
  tags: string; 
  url: string;
  cover_image_url: string;
  collection_id: string | null;
}

const initialResourceFormData: ResourceFormData = {
  title: "",
  description: "",
  type: resourceTypes[0]?.value || "",
  language: resourceLanguages[0]?.value || "",
  category: adminResourceCategories[0]?.value || "",
  tags: "",
  url: "",
  cover_image_url: "",
  collection_id: null,
};

export default function ManageResourcesPage() {
  const { currentLanguage } = useLanguage();
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [allCollections, setAllCollections] = useState<Collection[]>([]); 
  const [availableCollectionsForDropdown, setAvailableCollectionsForDropdown] = useState<Collection[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [currentResource, setCurrentResource] = useState<Resource | null>(null);
  const [formData, setFormData] = useState<ResourceFormData>(initialResourceFormData);
  const [coverPreviewError, setCoverPreviewError] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCollectionFilter, setSelectedCollectionFilter] = useState<string>("all");
  const [isGroupedByCollection, setIsGroupedByCollection] = useState(false);
  const [overallError, setOverallError] = useState<string | null>(null);

  const { toast } = useToast();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null); // Firebase user state

  useEffect(() => {
    let errorMsg = "";
    if (!isFirebaseConfigValid && firebaseInitializationError) {
        errorMsg += `Firebase Error: ${firebaseInitializationError}. `;
    }
    if (supabaseClientError) { // Check error from Supabase client lib
         errorMsg += `Supabase Client Error: ${supabaseClientError}. `;
    }
    if(errorMsg) {
        setOverallError(errorMsg + "Resource management functionality might be affected.");
        setIsLoading(false); // Stop main loading if fundamental config error
    }
  }, []);

  const pageTextDefinitions = useMemo(() => ({
    en: {
      pageTitle: "Manage Resources",
      pageDescription: "Add, view, edit, and remove resources. Files are hosted externally.",
      addNewButton: "Add New Resource",
      searchPlaceholder: "Search by title, tags, collection name...",
      filterByCollection: "Filter by Collection",
      allCollections: "All Collections",
      noCollectionLabel: "No Collection",
      groupByCollection: "Group by Collection",
      ungroupResources: "Ungroup Resources",
      resourcesInCollection: (count: number) => `${count} ${count === 1 ? 'resource' : 'resources'}`,
      resourceCount: (count: number) => `Total Resources: ${count}`,
      filteredResourceCount: (filtered: number, total: number) => `Showing ${filtered} of ${total} resources`,
      noResources: "No resources found. Add some to get started!",
      noFilteredResources: "No resources found matching your search criteria.",
      loadError: "Failed to load resources",
      loadCollectionsError: "Failed to load collections for selection",
      titleHeader: "Title",
      typeHeader: "Type",
      categoryHeader: "Category",
      collectionHeader: "Collection",
      langHeader: "Language",
      actionsHeader: "Actions",
      addModalTitle: "Add New Resource",
      editModalTitle: "Edit Resource",
      titleLabel: "Title",
      descriptionLabel: "Description (Optional)",
      typeLabel: "Type",
      languageLabel: "Language (of content)",
      categoryLabel: "Category (of content)",
      collectionLabel: "Collection (Optional)",
      selectCollectionPlaceholder: "Select a collection...",
      noCollectionOption: "-- No Collection (Standalone) --",
      noMatchingCollections: "No collections found matching this resource type. Ensure collections exist and are of the correct type (e.g., 'book' collections for 'PDF' resources).",
      tagsLabel: "Tags (comma-separated)",
      tagsPlaceholder: "e.g., fiqh, hadith, ramadan",
      fileUrlLabel: "Document URL (Internet Archive, etc.)",
      fileUrlPlaceholder: "https://archive.org/download/item/file.pdf",
      coverImageUrlLabel: "Cover Image URL (Optional)",
      coverImageUrlPlaceholder: "https://example.com/cover.jpg",
      submitButton: "Submit Resource",
      updateButton: "Update Resource",
      submittingButton: "Submitting...",
      addSuccessToast: "Resource added successfully.",
      updateSuccessToast: "Resource updated successfully.",
      errorToastTitle: "Error",
      apiError: "An API error occurred.",
      authenticationError: "Authentication Error",
      userNotAuthenticated: "User not authenticated for this operation.",
      failedToGetToken: "Failed to get Firebase ID token for API request.",
      networkError: "Network error: Could not connect to the API. Please check your internet connection and try again.",
      deleteConfirmTitle: "Confirm Deletion",
      deleteConfirmMessage: (name: string) => `Are you sure you want to delete the resource "${name}"? This action cannot be undone.`,
      deleteButton: "Delete",
      cancelButton: "Cancel",
      deleteSuccessToast: "Resource deleted successfully.",
      backToDashboard: "Back to Dashboard",
      viewExternalLink: "View External File",
      selectPlaceholder: "Select...",
      uniqueConstraintError: "A resource with this URL might already exist. Please check the Document URL.",
      manageCollectionsPrompt: "To manage collection names, descriptions, or covers, please go to the 'Manage Collections' page.",
      coverPreviewErrorText: "Could not load cover image. Please check the URL.",
      invalidFileUrlError: "Invalid Document URL. Please enter a valid link starting with http:// or https://.",
      invalidCoverUrlError: "Invalid Cover Image URL. Please enter a valid link starting with http:// or https://.",
      configErrorWarning: "Warning: There are issues with Firebase or Supabase configuration. Functionality may be limited.",
    },
    ar: {
      pageTitle: "إدارة الموارد",
      pageDescription: "إضافة وعرض وتعديل وإزالة الموارد. يتم استضافة الملفات خارجيًا.",
      addNewButton: "إضافة مورد جديد",
      searchPlaceholder: "ابحث بالعنوان، الوسوم، اسم المجموعة...",
      filterByCollection: "تصفية حسب المجموعة",
      allCollections: "كل المجموعات",
      noCollectionLabel: "بدون مجموعة",
      groupByCollection: "تجميع حسب المجموعة",
      ungroupResources: "إلغاء التجميع",
      resourcesInCollection: (count: number) => `${count} ${count === 1 ? 'مورد' : 'مورد'}`,
      resourceCount: (count: number) => `إجمالي الموارد: ${count}`,
      filteredResourceCount: (filtered: number, total: number) => `عرض ${filtered} من ${total} مورد`,
      noResources: "لم يتم العثور على موارد. ابدأ بإضافة البعض!",
      noFilteredResources: "لم يتم العثور على موارد تطابق معايير البحث الخاصة بك.",
      loadError: "فشل تحميل الموارد",
      loadCollectionsError: "فشل تحميل المجموعات للاختيار",
      titleHeader: "العنوان",
      typeHeader: "النوع",
      categoryHeader: "الفئة",
      collectionHeader: "المجموعة",
      langHeader: "اللغة",
      actionsHeader: "الإجراءات",
      addModalTitle: "إضافة مورد جديد",
      editModalTitle: "تعديل المورد",
      titleLabel: "العنوان",
      descriptionLabel: "الوصف (اختياري)",
      typeLabel: "النوع",
      languageLabel: "اللغة (للمحتوى)",
      categoryLabel: "الفئة (للمحتوى)",
      collectionLabel: "المجموعة (اختياري)",
      selectCollectionPlaceholder: "اختر مجموعة...",
      noCollectionOption: "-- بدون مجموعة (مستقل) --",
      noMatchingCollections: "لا توجد مجموعات مطابقة لنوع هذا المورد. تأكد من وجود مجموعات ومن أنها من النوع الصحيح (مثلاً، مجموعات 'كتب' لموارد 'PDF').",
      tagsLabel: "الوسوم (مفصولة بفواصل)",
      tagsPlaceholder: "مثال: فقه، حديث، رمضان",
      fileUrlLabel: "رابط الملف (أرشيف الإنترنت، إلخ)",
      fileUrlPlaceholder: "https://archive.org/download/item/file.pdf",
      coverImageUrlLabel: "رابط صورة الغلاف (اختياري)",
      coverImageUrlPlaceholder: "https://example.com/cover.jpg",
      submitButton: "إرسال المورد",
      updateButton: "تحديث المورد",
      submittingButton: "جارٍ الإرسال...",
      addSuccessToast: "تمت إضافة المورد بنجاح.",
      updateSuccessToast: "تم تحديث المورد بنجاح.",
      errorToastTitle: "خطأ",
      apiError: "حدث خطأ في واجهة برمجة التطبيقات.",
      authenticationError: "خطأ في المصادقة",
      userNotAuthenticated: "المستخدم غير مصادق عليه لهذه العملية.",
      failedToGetToken: "فشل في الحصول على رمز Firebase ID لطلب الواجهة البرمجية.",
      networkError: "خطأ في الشبكة: تعذر الاتصال بواجهة برمجة التطبيقات. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.",
      deleteConfirmTitle: "تأكيد الحذف",
      deleteConfirmMessage: (name: string) => `هل أنت متأكد أنك تريد حذف المورد "${name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      deleteButton: "حذف",
      cancelButton: "إلغاء",
      deleteSuccessToast: "تم حذف المورد بنجاح.",
      backToDashboard: "العودة إلى لوحة التحكم",
      viewExternalLink: "عرض الملف الخارجي",
      selectPlaceholder: "اختر...",
      uniqueConstraintError: "قد يوجد مورد بهذا الرابط بالفعل. يرجى التحقق من رابط المستند.",
      manageCollectionsPrompt: "لإدارة أسماء المجموعات أو أوصافها أو أغلفتها، يرجى الانتقال إلى صفحة 'إدارة المجموعات'.",
      coverPreviewErrorText: "تعذر تحميل صورة الغلاف. يرجى التحقق من الرابط.",
      invalidFileUrlError: "رابط المستند غير صالح. يرجى إدخال رابط صحيح يبدأ بـ http:// أو https://.",
      invalidCoverUrlError: "رابط صورة الغلاف غير صالح. يرجى إدخال رابط صحيح يبدأ بـ http:// أو https://.",
      configErrorWarning: "تحذير: توجد مشكلات في تكوين Firebase أو Supabase. قد تكون الوظائف محدودة.",
    }
  }), [currentLanguage]);
  const T = pageTextDefinitions[currentLanguage];

  const fetchData = useCallback(async () => {
    if (overallError || !supabase) {
        setIsLoading(false);
        if(!overallError && !supabase) toast({ title: T.errorToastTitle, description: "Supabase client not initialized for fetching data.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    try {
      if (!supabase) {
        toast({ title: T.errorToastTitle, description: "Database connection is not available.", variant: "destructive" });
        setAllResources([]);
        setFilteredResources([]);
        setAllCollections([]);
        return;
      }
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('resources')
        .select(`
          *,
          collection:collections (id, name, collection_content_type)
        `)
        .order('created_at', { ascending: false });

      if (resourcesError) throw resourcesError;
      setAllResources((resourcesData || []) as Resource[]);
      setFilteredResources((resourcesData || []) as Resource[]);

      const { data: collectionsData, error: collectionsListError } = await supabase
        .from('collections')
        .select('id, name, collection_content_type, created_at')
        .order('name', { ascending: true });
      
      if (collectionsListError) {
        toast({ title: T.errorToastTitle, description: T.loadCollectionsError, variant: "destructive" });
        setAllCollections([]);
      } else {
        setAllCollections(collectionsData || []);
      }

    } catch (error: any) {
      toast({ title: T.loadError, description: error.message || "An unknown error occurred", variant: "destructive" });
      setAllResources([]);
      setFilteredResources([]);
      setAllCollections([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, T, toast, overallError]); 

  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;

    if (auth) {
      unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
          setCurrentUser(user);
          if (!overallError) fetchData(); // Fetch data only if no initial config errors
        } else {
          setCurrentUser(null); // Clear user
          router.replace('/admin/login');
        }
      });
    } else {
      setOverallError(prev => (prev ? prev + " Firebase auth not initialized." : "Firebase auth not initialized."));
      setIsLoading(false);
      router.replace('/admin/login'); // Critical auth error, redirect
      return;
    }

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [router, fetchData, overallError]); 

  useEffect(() => {
    let resourcesToFilter = allResources;
    const lowerSearchTerm = searchTerm.toLowerCase();

    if (searchTerm) {
      resourcesToFilter = resourcesToFilter.filter(res =>
        (res.title?.toLowerCase() || '').includes(lowerSearchTerm) ||
        (res.description?.toLowerCase() || '').includes(lowerSearchTerm) ||
        (res.collection?.name?.toLowerCase() || '').includes(lowerSearchTerm) ||
        (res.tags?.some(tag => tag.toLowerCase().includes(lowerSearchTerm)))
      );
    }

    // Filter by collection only if not in grouped mode
    if (!isGroupedByCollection && selectedCollectionFilter !== "all") {
      if (selectedCollectionFilter === "none") {
        resourcesToFilter = resourcesToFilter.filter(res => !res.collection_id);
      } else {
        resourcesToFilter = resourcesToFilter.filter(res => res.collection_id === selectedCollectionFilter);
      }
    }

    setFilteredResources(resourcesToFilter);
  }, [searchTerm, selectedCollectionFilter, isGroupedByCollection, allResources]);

  const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === "cover_image_url") setCoverPreviewError(false);
  };

  const filterCollectionsForDropdown = useCallback((resourceType: string | null, collections: Collection[]) => {
    if (!resourceType) {
        setAvailableCollectionsForDropdown(collections);
        return;
    }
    let targetCollectionType: 'book' | 'audio' | 'video' | null = null;
    if (['pdf', 'article'].includes(resourceType)) {
        targetCollectionType = 'book';
    } else if (resourceType === 'audio') {
        targetCollectionType = 'audio';
    } else if (resourceType === 'video') {
        targetCollectionType = 'video';
    }

    let filtered: Collection[];
    if (targetCollectionType) {
        filtered = collections.filter(c => c.collection_content_type === targetCollectionType);
    } else {
        // For resource types like 'image' or 'other', or if targetCollectionType is null,
        // show collections that are general (null/undefined content_type) or match a less common type.
        // For now, let's just show all if no direct match or if type is 'image'/'other'.
        // A more sophisticated approach might involve tagging collections for 'general' use.
        if (resourceType === 'image' || resourceType === 'other' || !targetCollectionType) {
            filtered = collections.filter(c => !c.collection_content_type || !['book', 'audio', 'video'].includes(c.collection_content_type!));
        } else {
           filtered = []; // Should not happen if targetCollectionType is set
        }
    }
    setAvailableCollectionsForDropdown(filtered);
  }, []);

  // Helper function to get the position number of a resource within its collection
  const getResourcePositionInCollection = useCallback((resource: Resource) => {
    if (!resource.collection_id) return null;
    
    // Get all resources in the same collection, sorted by created_at (oldest first)
    const collectionResources = allResources
      .filter(r => r.collection_id === resource.collection_id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const position = collectionResources.findIndex(r => r.id === resource.id) + 1;
    return position;
  }, [allResources]);

  // Function to group resources by collection
  const groupResourcesByCollection = useCallback(() => {
    const grouped: { [key: string]: Resource[] } = {};
    
    filteredResources.forEach(resource => {
      const key = resource.collection_id || 'no-collection';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(resource);
    });

    // Sort resources within each group by created_at
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    return grouped;
  }, [filteredResources]);


  const handleSelectChange = (name: keyof ResourceFormData, value: string | null) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'type') {
      filterCollectionsForDropdown(value, allCollections);
    }
  };

  const resetForm = useCallback(() => {
    setFormData(initialResourceFormData);
    setCurrentResource(null);
    setCoverPreviewError(false);
    filterCollectionsForDropdown(initialResourceFormData.type, allCollections);
  }, [allCollections, filterCollectionsForDropdown]);

  const openAddDialog = () => {
    resetForm(); 
    setDialogMode('add');
    setIsDialogOpen(true);
  };

  const openEditDialog = (resource: Resource) => {
    setCurrentResource(resource);
    const resourceFormData = {
      title: resource.title,
      description: resource.description || "",
      type: resource.type,
      language: resource.language,
      category: resource.category,
      tags: resource.tags?.join(", ") || "",
      url: resource.url,
      cover_image_url: resource.cover_image_url || "",
      collection_id: resource.collection_id || null,
    };
    setFormData(resourceFormData);
    filterCollectionsForDropdown(resource.type, allCollections); 
    setDialogMode('edit');
    setCoverPreviewError(false);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (overallError) {
      toast({ title: T.errorToastTitle, description: T.configErrorWarning, variant: "destructive" });
      return;
    }
    if (!formData.title || !formData.url || !formData.type || !formData.language || !formData.category) {
      toast({ title: T.errorToastTitle, description: "Please fill in all required fields (Title, URL, Type, Language, Category).", variant: "destructive" });
      return;
    }
    if (!isValidHttpUrl(formData.url)) {
      toast({ title: T.errorToastTitle, description: T.invalidFileUrlError, variant: "destructive" });
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

      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      const resourcePayload = {
        ...formData,
        tags: tagsArray.length > 0 ? tagsArray : null,
        collection_id: formData.collection_id === "null_option" ? null : formData.collection_id,
      };

      let response;
      if (dialogMode === 'add') {
        response = await fetch('/api/admin/resources', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(resourcePayload),
        });
      } else if (currentResource) {
        response = await fetch(`/api/admin/resources/${currentResource.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(resourcePayload),
        });
      } else {
        throw new Error("Invalid dialog mode or missing resource for update.");
      }

      const responseData = await response.json();

      if (!response.ok) {
        let description = responseData.error || T.apiError;
        if (response.status === 409 && responseData.error?.includes("URL already exists")) {
            description = T.uniqueConstraintError;
        } else if (responseData.issues) {
            description = Object.values(responseData.issues).flat().join(' ');
        }
        throw new Error(description);
      }
      
      toast({ title: "Success", description: dialogMode === 'add' ? T.addSuccessToast : T.updateSuccessToast });
      setIsDialogOpen(false);
      fetchData(); 

    } catch (err: any) {
      toast({ title: T.errorToastTitle, description: err.message || T.apiError, variant: "destructive", duration: 9000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirmation = (resource: Resource) => {
    setResourceToDelete(resource);
  };

  const handleDeleteResource = async () => {
    if (overallError) {
      toast({ title: T.errorToastTitle, description: T.configErrorWarning, variant: "destructive" });
      return;
    }
    if (!resourceToDelete || !currentUser) {
        toast({ title: T.errorToastTitle, description: !currentUser ? T.userNotAuthenticated : "No resource selected for deletion.", variant: "destructive" });
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

      const response = await fetch(`/api/admin/resources/${resourceToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: T.apiError }));
        throw new Error(errorData.error || T.apiError);
      }

      toast({ title: "Success", description: T.deleteSuccessToast });
      setResourceToDelete(null);
      fetchData(); 
    } catch (error: any) {
      toast({ title: T.errorToastTitle, description: error.message || T.apiError, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  useEffect(() => { 
    if (isDialogOpen) {
        filterCollectionsForDropdown(formData.type, allCollections);
    }
  }, [allCollections, isDialogOpen, formData.type, filterCollectionsForDropdown]);


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
        <Package className="mx-auto h-14 w-14 text-primary mb-2" />
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
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={openAddDialog} disabled={isSubmitting || !!overallError}>
            <PlusCircle className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} /> {T.addNewButton}
          </Button>
          <Button 
            variant={isGroupedByCollection ? "default" : "outline"} 
            onClick={() => setIsGroupedByCollection(!isGroupedByCollection)}
            disabled={isLoading || !!overallError}
          >
            <Layers className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} />
            {isGroupedByCollection ? T.ungroupResources : T.groupByCollection}
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:w-auto sm:max-w-xs">
            <SearchIcon className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground ${currentLanguage === 'ar' ? 'right-3' : 'left-3'}`} />
            <Input type="search" placeholder={T.searchPlaceholder} className={`${currentLanguage === 'ar' ? 'pr-10' : 'pl-10'} w-full`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={isLoading || !!overallError}/>
          </div>
          {!isGroupedByCollection && (
            <Select value={selectedCollectionFilter} onValueChange={setSelectedCollectionFilter} disabled={isLoading || !!overallError}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={T.filterByCollection} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{T.allCollections}</SelectItem>
                <SelectItem value="none">{T.noCollectionLabel}</SelectItem>
                {allCollections.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
         <Button variant="outline" asChild>
          <Link href="/admin/dashboard">
            <ArrowLeft className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} /> {T.backToDashboard}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{T.pageTitle}</CardTitle>
            <div className="text-sm text-muted-foreground">
              {filteredResources.length !== allResources.length ? 
                T.filteredResourceCount(filteredResources.length, allResources.length) : 
                T.resourceCount(allResources.length)
              }
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : allResources.length === 0 && !overallError ? (
            <p className="text-center text-muted-foreground py-10">{T.noResources}</p>
          ) : filteredResources.length === 0 && searchTerm && !overallError ? (
             <p className="text-center text-muted-foreground py-10">{T.noFilteredResources}</p>
          ) : !overallError ? (
            isGroupedByCollection ? (
              // Grouped view by collection
              <div className="space-y-6">
                {Object.entries(groupResourcesByCollection()).map(([collectionId, resources]) => {
                  const collection = allCollections.find(c => c.id === collectionId);
                  const collectionName = collectionId === 'no-collection' ? T.noCollectionLabel : (collection?.name || 'Unknown Collection');
                  
                  return (
                    <div key={collectionId} className="border rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-4 text-primary">
                        {collectionName} ({T.resourcesInCollection(resources.length)})
                      </h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{T.titleHeader}</TableHead>
                              <TableHead>{T.typeHeader}</TableHead>
                              <TableHead>Position</TableHead>
                              <TableHead>{T.langHeader}</TableHead>
                              <TableHead className="text-right">{T.actionsHeader}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {resources.map((res, index) => {
                              const resourceTypeLabel = resourceTypes.find(rt => rt.value === res.type)?.label[currentLanguage] || res.type;
                              
                              return (
                                <TableRow key={res.id}>
                                  <TableCell className="font-medium max-w-xs truncate" title={res.title}>{res.title}</TableCell>
                                  <TableCell>{resourceTypeLabel}</TableCell>
                                  <TableCell className="font-medium">#{index + 1}</TableCell>
                                  <TableCell>{resourceLanguages.find(rl => rl.value === res.language)?.label[currentLanguage] || res.language}</TableCell>
                                  <TableCell className="text-right space-x-1 rtl:space-x-reverse">
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link href={res.url} target="_blank" rel="noopener noreferrer" title={T.viewExternalLink}><ExternalLink className="h-4 w-4 text-blue-500"/></Link>
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(res)} disabled={isSubmitting} title="Edit">
                                        <Edit3 className="h-4 w-4 text-amber-600" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => openDeleteConfirmation(res)} disabled={isSubmitting} title="Delete">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Regular table view
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{T.titleHeader}</TableHead>
                      <TableHead>{T.typeHeader}</TableHead>
                      <TableHead>{T.collectionHeader}</TableHead>
                      <TableHead>{T.langHeader}</TableHead>
                      <TableHead className="text-right">{T.actionsHeader}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResources.map((res) => {
                      const positionInCollection = getResourcePositionInCollection(res);
                      const resourceTypeLabel = resourceTypes.find(rt => rt.value === res.type)?.label[currentLanguage] || res.type;
                      
                      let collectionDisplay = "N/A";
                      if (res.collection?.name) {
                        if (positionInCollection) {
                          // Format: "Collection Name (Book #3)" or "Collection Name (Audio #1)"
                          collectionDisplay = `${res.collection.name} (${resourceTypeLabel} #${positionInCollection})`;
                        } else {
                          collectionDisplay = res.collection.name;
                        }
                      }
                      
                      return (
                      <TableRow key={res.id}>
                        <TableCell className="font-medium max-w-xs truncate" title={res.title}>{res.title}</TableCell>
                        <TableCell>{resourceTypeLabel}</TableCell>
                        <TableCell className="max-w-[180px] truncate" title={collectionDisplay}>
                          {collectionDisplay}
                        </TableCell>
                        <TableCell>{resourceLanguages.find(rl => rl.value === res.language)?.label[currentLanguage] || res.language}</TableCell>
                        <TableCell className="text-right space-x-1 rtl:space-x-reverse">
                          <Button variant="ghost" size="icon" asChild>
                              <Link href={res.url} target="_blank" rel="noopener noreferrer" title={T.viewExternalLink}><ExternalLink className="h-4 w-4 text-blue-500"/></Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(res)} disabled={isSubmitting} title="Edit">
                              <Edit3 className="h-4 w-4 text-amber-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openDeleteConfirmation(res)} disabled={isSubmitting} title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )
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
              <Label htmlFor="title-modal">{T.titleLabel}</Label>
              <Input id="title-modal" name="title" autoComplete="off" value={formData.title} onChange={handleFormInputChange} dir={currentLanguage === 'ar' && formData.language === 'ar' ? 'rtl' : 'ltr'} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="url-modal">{T.fileUrlLabel}</Label>
              <Input id="url-modal" name="url" type="url" autoComplete="url" placeholder={T.fileUrlPlaceholder} value={formData.url} onChange={handleFormInputChange} dir="ltr" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cover_image_url-modal">{T.coverImageUrlLabel}</Label>
              <Input id="cover_image_url-modal" name="cover_image_url" type="url" autoComplete="off" placeholder={T.coverImageUrlPlaceholder} value={formData.cover_image_url} onChange={handleFormInputChange} dir="ltr" />
              {formData.cover_image_url && !coverPreviewError && isValidHttpUrl(formData.cover_image_url) && (
                <div className="mt-2 rounded border p-2 flex justify-center"><NextImage key={formData.cover_image_url} src={formData.cover_image_url} alt="Cover preview" width={100} height={150} className="object-contain" onError={() => setCoverPreviewError(true)} data-ai-hint="resource cover"/></div>
              )}
              {coverPreviewError && formData.cover_image_url && (
                 <div className="mt-2 rounded border border-destructive/50 bg-destructive/10 p-2 flex justify-center items-center"><p className="text-xs text-destructive">Cover image failed to load. Check URL.</p></div>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="description-modal">{T.descriptionLabel}</Label>
              <Textarea id="description-modal" name="description" autoComplete="off" value={formData.description} onChange={handleFormInputChange} placeholder={T.descriptionLabel} dir={currentLanguage === 'ar' && formData.language === 'ar' ? 'rtl' : 'ltr'} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="type-modal">{T.typeLabel}</Label>
                  <Select value={formData.type} onValueChange={(value) => handleSelectChange('type', value)}>
                      <SelectTrigger id="type-modal"><SelectValue placeholder={T.selectPlaceholder} /></SelectTrigger>
                      <SelectContent>{resourceTypes.map(rt => <SelectItem key={rt.value} value={rt.value}>{rt.label[currentLanguage]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="language-modal">{T.languageLabel}</Label>
                  <Select value={formData.language} onValueChange={(value) => handleSelectChange('language', value)}>
                      <SelectTrigger id="language-modal"><SelectValue placeholder={T.selectPlaceholder} /></SelectTrigger>
                      <SelectContent>{resourceLanguages.map(rl => <SelectItem key={rl.value} value={rl.value}>{rl.label[currentLanguage]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="category-modal">{T.categoryLabel}</Label>
              <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
                  <SelectTrigger id="category-modal"><SelectValue placeholder={T.selectPlaceholder} /></SelectTrigger>
                  <SelectContent>{adminResourceCategories.map(rc => <SelectItem key={rc.value} value={rc.value}>{rc.label[currentLanguage]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="collection_id-modal">{T.collectionLabel}</Label>
              <Select value={formData.collection_id || "null_option"} onValueChange={(value) => handleSelectChange('collection_id', value === "null_option" ? null : value)}>
                  <SelectTrigger id="collection_id-modal"><SelectValue placeholder={T.selectCollectionPlaceholder} /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="null_option">{T.noCollectionOption}</SelectItem>
                      {availableCollectionsForDropdown.length > 0 ? (
                        availableCollectionsForDropdown.map(col => <SelectItem key={col.id} value={col.id}>{col.name} ({col.collection_content_type || 'N/A'})</SelectItem>)
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">{T.noMatchingCollections}</div>
                      )}
                  </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{T.manageCollectionsPrompt}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="tags-modal">{T.tagsLabel}</Label>
              <Input id="tags-modal" name="tags" value={formData.tags} onChange={handleFormInputChange} placeholder={T.tagsPlaceholder} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" onClick={() => { resetForm(); setIsDialogOpen(false);}}>{T.cancelButton}</Button></DialogClose>
            <Button onClick={handleSubmit} disabled={isSubmitting || !formData.title || !formData.url || !!overallError}>
              {isSubmitting ? <Loader2 className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4 animate-spin`} /> : <UploadCloud className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} />}
              {dialogMode === 'add' ? T.submitButton : T.updateButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resourceToDelete} onOpenChange={() => setResourceToDelete(null)}>
        <DialogContent dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
          {/* Insert visually hidden DialogTitle for accessibility */}
          <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
            <DialogTitle>{T.deleteConfirmTitle}</DialogTitle>
          </span>
          <DialogHeader>
            <DialogTitle>{T.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>{T.deleteConfirmMessage(resourceToDelete?.title || "")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResourceToDelete(null)}>{T.cancelButton}</Button>
            <Button variant="destructive" onClick={handleDeleteResource} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {T.deleteButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

