"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { auth, isFirebaseConfigValid, firebaseInitializationError } from "@/lib/firebase";
import { supabase, clientInitializationError as supabaseClientError } from "@/lib/supabase";
import { Loader2, Send, ExternalLink, ListFilter, CheckCircle, XCircle, MessageSquareText, AlertTriangle, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import type { User as FirebaseUser } from 'firebase/auth';
import { useLanguage } from "@/context/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Inline VisuallyHidden component for accessibility
const VisuallyHidden = ({ children }: { children: React.ReactNode }) => (
  <span style={{
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap',
    border: 0,
  }}>
    {children}
  </span>
);

interface QuestionSubmission {
  id: string;
  email: string;
  category: string;
  question_text: string;
  submitted_at: string;
  status: 'pending' | 'answered' | 'rejected';
  answer_youtube_link?: string | null;
  answered_at?: string | null;
  rejection_reason?: string | null;
}

const adminResourceCategories = [
  { value: "aqidah", label: { en: "ʿAqīdah", ar: "عقيدة" } },
  { value: "ahadith", label: { en: "Aḥadīth", ar: "أحاديث" } },
  { value: "quran", label: { en: "Qur'an", ar: "القرآن" } },
  { value: "fiqh", label: { en: "Fiqh", ar: "الفقه" } },
  { value: "family", label: { en: "Family", ar: "الأسرة" } },
  { value: "business", label: { en: "Business", ar: "المعاملات" } },
  { value: "prayer", label: { en: "Prayer", ar: "الصلاة" } },
];

const pageTexts = {
  en: {
    title: "Questions Management",
    description: "Review, answer, or reject submitted questions.",
    noQuestions: "No questions found matching the current filter.",
    noQuestionsRLSHint: "If you expect data, verify data directly in the DB table with the current filter. Ensure your API route has correct Supabase & Firebase Admin credentials.",
    loadError: "Failed to load questions.",
    fetchApiError: "Failed to fetch questions from API. Check server logs.",
    updateApiError: "Failed to update question via API. Check server logs.",
    supabaseError: "A Supabase error occurred. Please check console for details.",
    possibleRLSError: "A Supabase error occurred. This could be due to Row Level Security policies or JWT configuration. Please check console for details.",
    questionLabel: "Question",
    categoryLabel: "Category",
    submittedByLabel: "Submitted by",
    submittedAtLabel: "Submitted At",
    statusLabel: "Status",
    answerButton: "Answer",
    rejectButton: "Reject",
    viewAnswerButton: "View Answer",
    answerModalTitle: "Answer Question",
    youtubeLinkLabel: "YouTube Answer Link",
    youtubeLinkPlaceholder: "https://youtube.com/watch?v=...",
    submitAnswerButton: "Submit Answer",
    submittingAnswerButton: "Submitting...",
    answerSuccessToastTitle: "Answer Submitted",
    answerSuccessToastDesc: "The question has been marked as answered. Email notification logged to server.",
    answerErrorToastTitle: "Error Submitting Answer",
    rejectionModalTitle: "Reject Question",
    rejectionReasonLabel: "Reason for Rejection (Optional)",
    rejectionReasonPlaceholder: "Enter reason for rejection...",
    submitRejectionButton: "Submit Rejection",
    submittingRejectionButton: "Submitting...",
    rejectionSuccessToastTitle: "Question Rejected",
    rejectionSuccessToastDesc: "The question has been marked as rejected. Email notification logged to server.",
    rejectionErrorToastTitle: "Error Rejecting Question",
    filterStatusLabel: "Filter by Status",
    all: "All",
    pending: "Pending",
    answered: "Answered",
    rejected: "Rejected",
    cancelButton: "Cancel",
    authenticationError: "Authentication Error",
    userNotAuthenticated: "User not authenticated for write operation.",
    failedToGetToken: "Failed to get Firebase ID token for API request.",
    refreshButton: "Refresh List",
    refreshingButton: "Refreshing...",
  },
  ar: {
    title: "إدارة الأسئلة",
    description: "مراجعة الأسئلة المرسلة والإجابة عليها أو رفضها.",
    noQuestions: "لم يتم العثور على أسئلة تطابق الفلتر الحالي.",
    noQuestionsRLSHint: "إذا كنت تتوقع وجود بيانات، تحقق من البيانات مباشرة في جدول قاعدة البيانات مع الفلتر الحالي. تأكد من أن مسار API الخاص بك لديه بيانات اعتماد Supabase و Firebase Admin الصحيحة.",
    loadError: "فشل تحميل الأسئلة.",
    fetchApiError: "فشل جلب الأسئلة من الواجهة البرمجية. تحقق من سجلات الخادم.",
    updateApiError: "فشل تحديث السؤال عبر الواجهة البرمجية. تحقق من سجلات الخادم.",
    supabaseError: "حدث خطأ في Supabase. يرجى التحقق من وحدة التحكم لمزيد من التفاصيل.",
    possibleRLSError: "حدث خطأ في Supabase. قد يكون هذا بسبب سياسات أمان الصفوف (RLS) أو إعدادات JWT. يرجى التحقق من وحدة التحكم لمزيد من التفاصيل.",
    questionLabel: "السؤال",
    categoryLabel: "الفئة",
    submittedByLabel: "مرسل بواسطة",
    submittedAtLabel: "تاريخ الإرسال",
    statusLabel: "الحالة",
    answerButton: "إجابة",
    rejectButton: "رفض",
    viewAnswerButton: "عرض الإجابة",
    answerModalTitle: "الإجابة على السؤال",
    youtubeLinkLabel: "رابط إجابة يوتيوب",
    youtubeLinkPlaceholder: "https://youtube.com/watch?v=...",
    submitAnswerButton: "إرسال الإجابة",
    submittingAnswerButton: "جارٍ الإرسال...",
    answerSuccessToastTitle: "تم إرسال الإجابة",
    answerSuccessToastDesc: "تم تحديد السؤال كـ \"تمت الإجابة عليه\". تم تسجيل إشعار البريد الإلكتروني إلى الخادم.",
    answerErrorToastTitle: "خطأ في إرسال الإجابة",
    rejectionModalTitle: "رفض السؤال",
    rejectionReasonLabel: "سبب الرفض (اختياري)",
    rejectionReasonPlaceholder: "أدخل سبب الرفض...",
    submitRejectionButton: "إرسال الرفض",
    submittingRejectionButton: "جارٍ الإرسال...",
    rejectionSuccessToastTitle: "تم رفض السؤال",
    rejectionSuccessToastDesc: "تم تحديد السؤال كـ \"مرفوض\". تم تسجيل إشعار البريد الإلكتروني إلى الخادم.",
    rejectionErrorToastTitle: "خطأ في رفض السؤال",
    filterStatusLabel: "تصفية حسب الحالة",
    all: "الكل",
    pending: "معلقة",
    answered: "تمت الإجابة",
    rejected: "مرفوضة",
    cancelButton: "إلغاء",
    authenticationError: "خطأ في المصادقة",
    userNotAuthenticated: "المستخدم غير مصادق عليه لعملية الكتابة.",
    failedToGetToken: "فشل في الحصول على رمز Firebase ID لطلب الواجهة البرمجية.",
    refreshButton: "تحديث القائمة",
    refreshingButton: "جارٍ التحديث...",
  }
};

export default function QuestionsManagementPage() {
  const { currentLanguage } = useLanguage();
  const [questions, setQuestions] = useState<QuestionSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true); // For initial load and filter changes
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false); // For refresh button
  const [isSubmitting, setIsSubmitting] = useState(false); // For answer/reject modals
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionSubmission | null>(null);
  const [youtubeLinkInput, setYoutubeLinkInput] = useState("");
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'answered' | 'rejected'>('pending');
  const [dialogType, setDialogType] = useState<'answer' | 'reject' | null>(null);
  const [overallError, setOverallError] = useState<string | null>(null);

  const { toast } = useToast();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const T = useMemo(() => pageTexts[currentLanguage as keyof typeof pageTexts], [currentLanguage]);

  useEffect(() => {
    let errorMsg = "";
    if (!isFirebaseConfigValid && firebaseInitializationError) {
        errorMsg += `Firebase Error: ${firebaseInitializationError}. `;
    }
    if (supabaseClientError) {
         errorMsg += `Supabase Client Error: ${supabaseClientError}. `;
    }
    if(errorMsg) {
        setOverallError(errorMsg + "Questions management functionality might be affected.");
        setIsLoading(false);
    }
  }, []);

  const fetchQuestions = useCallback(async (statusFilter: 'all' | 'pending' | 'answered' | 'rejected', manualRefresh = false) => {
    if (authLoading || !currentUser) {
        console.warn("Admin Questions Management: fetchQuestions prerequisites not met (authLoading or no currentUser). Aborting fetch.");
        if (manualRefresh) setIsManuallyRefreshing(false); else setIsLoading(false);
        if (!authLoading && !currentUser) setQuestions([]);
        return;
    }
    
    if (overallError) {
        console.warn("Admin Questions Management: Overall error detected, skipping fetch.");
        if (manualRefresh) setIsManuallyRefreshing(false); else setIsLoading(false);
        return;
    }

    if (manualRefresh) setIsManuallyRefreshing(true); else setIsLoading(true);

    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      let query = supabase
        .from('questions')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
        console.log(`Admin Questions Management: Applying status filter: status = '${statusFilter}'`);
      } else {
        console.log("Admin Questions Management: No status filter applied or 'all' selected.");
      }

      console.log("Admin Questions Management: Executing Supabase query to fetch questions...");
      const { data, error } = await query;

      if (error) {
        console.error('Admin Questions Management: Supabase query error while fetching questions:', error);
        throw new Error(error.message || 'Failed to fetch questions from database.');
      }

      console.log(`Admin Questions Management: Successfully fetched ${data?.length || 0} questions from Supabase.`);
      setQuestions((data as QuestionSubmission[]) || []);

    } catch (error: any) {
      console.error("Admin Questions Management: Error fetching questions:", error);
      let errorMessage = T.loadError;
      
      if (error.message.includes('Failed to fetch')) {
        errorMessage = currentLanguage === 'ar' 
          ? 'فشل في الاتصال بقاعدة البيانات. تحقق من اتصال الإنترنت.'
          : 'Failed to connect to database. Please check your internet connection.';
      }
      
      toast({ title: T.loadError, description: errorMessage, variant: "destructive", duration: 8000 });
      setQuestions([]);
    } finally {
      if (manualRefresh) setIsManuallyRefreshing(false); else setIsLoading(false);
    }
  }, [currentUser, T, toast, authLoading, currentLanguage, overallError, supabase]);

  useEffect(() => {
    if (!auth) {
      setOverallError(prev => (prev ? prev + " Firebase auth not initialized." : "Firebase auth not initialized."));
      setIsLoading(false);
      router.replace('/admin/login');
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setAuthLoading(false);
        if (!overallError) fetchQuestions(filterStatus);
      } else {
        setCurrentUser(null);
        setAuthLoading(false);
        router.replace('/admin/login');
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, [router, fetchQuestions, filterStatus, overallError]);

  const handleOpenAnswerModal = (q: QuestionSubmission) => {
    setSelectedQuestion(q);
    setYoutubeLinkInput(q.answer_youtube_link || "");
    setRejectionReasonInput("");
    setDialogType('answer');
  };

  const handleOpenRejectionModal = (q: QuestionSubmission) => {
    setSelectedQuestion(q);
    setYoutubeLinkInput("");
    setRejectionReasonInput(q.rejection_reason || "");
    setDialogType('reject');
  };

  const closeDialog = () => {
    setSelectedQuestion(null);
    setDialogType(null);
    setYoutubeLinkInput("");
    setRejectionReasonInput("");
  }

  const handleSubmitAnswer = async () => {
    if (!selectedQuestion || !youtubeLinkInput) return;
    if (!currentUser) {
        toast({ title: T.authenticationError, description: T.userNotAuthenticated, variant: "destructive" });
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

      const response = await fetch(`/api/admin/questions/${selectedQuestion.id}/answer`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            youtubeLink: youtubeLinkInput,
            questionEmail: selectedQuestion.email
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response from API." }));
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }
      
      // const updatedQuestion: QuestionSubmission = await response.json(); // No longer needed for optimistic update on this specific item
      toast({ title: T.answerSuccessToastTitle, description: T.answerSuccessToastDesc });
      closeDialog();
      await fetchQuestions(filterStatus); // Re-fetch the list for the current filter
    } catch (error: any) {
      console.error("Error submitting answer via API: ", error);
      toast({ title: T.answerErrorToastTitle, description: `${error.message || T.updateApiError}.`, variant: "destructive", duration: 8000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitRejection = async () => {
    if (!selectedQuestion) return;
    if (!currentUser) {
        toast({ title: T.authenticationError, description: T.userNotAuthenticated, variant: "destructive" });
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

      const response = await fetch(`/api/admin/questions/${selectedQuestion.id}/reject`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            rejectionReason: rejectionReasonInput || null,
            questionEmail: selectedQuestion.email
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response from API." }));
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }
      
      // const updatedQuestion: QuestionSubmission = await response.json(); // No longer needed for optimistic update
      toast({ title: T.rejectionSuccessToastTitle, description: T.rejectionSuccessToastDesc });
      closeDialog();
      await fetchQuestions(filterStatus); // Re-fetch the list for the current filter
    } catch (error: any) {
      console.error("Error submitting rejection via API: ", error);
      toast({ title: T.rejectionErrorToastTitle, description: `${error.message || T.updateApiError}.`, variant: "destructive", duration: 8000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (isoString: string | undefined | null) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'answered': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (authLoading && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-2 sm:px-4 py-4 space-y-6" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <header className="text-center px-2">
        <MessageSquareText className="mx-auto h-14 w-14 text-primary mb-2" />
        <h1 className="text-2xl md:text-4xl font-bold text-primary mb-1 font-headline">
          {T.title}
        </h1>
        <p className="text-base text-muted-foreground">
          {T.description}
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
                <ListFilter className="h-5 w-5 text-muted-foreground" />
                <CardTitle>{T.filterStatusLabel}</CardTitle>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)} disabled={isLoading || isManuallyRefreshing}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder={T.filterStatusLabel} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{T.all}</SelectItem>
                    <SelectItem value="pending">{T.pending}</SelectItem>
                    <SelectItem value="answered">{T.answered}</SelectItem>
                    <SelectItem value="rejected">{T.rejected}</SelectItem>
                </SelectContent>
                </Select>
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => fetchQuestions(filterStatus, true)} 
                    disabled={isLoading || isManuallyRefreshing}
                    title={T.refreshButton}
                >
                {isManuallyRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-10">
                <p className="text-muted-foreground">{T.noQuestions}</p>
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300 flex items-center justify-center space-x-2 rtl:space-x-reverse">
                    <AlertTriangle className="h-5 w-5 shrink-0"/>
                    <span>{T.noQuestionsRLSHint}</span>
                </div>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q) => (
                <Card key={q.id} className="shadow-sm">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg font-semibold text-primary">
                                {adminResourceCategories.find(c => c.value === q.category)?.label[currentLanguage as keyof typeof adminResourceCategories[0]['label']] || q.category}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {T.submittedByLabel}: {q.email} | {T.submittedAtLabel}: {formatDate(q.submitted_at)}
                            </CardDescription>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${getStatusBadgeColor(q.status)}`}>
                            {q.status === 'pending' && T.pending}
                            {q.status === 'answered' && T.answered}
                            {q.status === 'rejected' && T.rejected}
                        </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/80 whitespace-pre-wrap" dir="auto">{q.question_text}</p>
                    {q.status === 'answered' && q.answer_youtube_link && (
                        <div className="mt-2">
                            <Label className="font-medium">{T.youtubeLinkLabel}:</Label>
                            <a href={q.answer_youtube_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all flex items-center">
                                {q.answer_youtube_link} <ExternalLink className="h-4 w-4 ml-1 rtl:mr-1 rtl:ml-0"/>
                            </a>
                        </div>
                    )}
                    {q.status === 'rejected' && q.rejection_reason && (
                        <div className="mt-2">
                            <Label className="font-medium">{T.rejectionReasonLabel}:</Label>
                            <p className="text-sm text-muted-foreground">{q.rejection_reason}</p>
                        </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                    {q.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => handleOpenAnswerModal(q)} variant="default" disabled={isSubmitting}>
                          <CheckCircle className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} />{T.answerButton}
                        </Button>
                        <Button size="sm" onClick={() => handleOpenRejectionModal(q)} variant="destructive" disabled={isSubmitting}>
                           <XCircle className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} />{T.rejectButton}
                        </Button>
                      </>
                    )}
                    {q.status === 'answered' && q.answer_youtube_link && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={q.answer_youtube_link} target="_blank" rel="noopener noreferrer">
                           <ExternalLink className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} />{T.viewAnswerButton}
                        </a>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedQuestion && dialogType === 'answer' && (
        <Dialog open={!!selectedQuestion && dialogType === 'answer'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
          <DialogContent dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
            {/* Visually hidden DialogTitle for accessibility */}
            <VisuallyHidden>
              <DialogTitle>{T.answerModalTitle}</DialogTitle>
            </VisuallyHidden>
            <DialogHeader>
              <DialogTitle>{T.answerModalTitle}</DialogTitle>
              <DialogDescription className="whitespace-pre-wrap py-2" dir="auto">
                <strong>{T.questionLabel}:</strong> {selectedQuestion.question_text}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="youtubeLinkInput">{T.youtubeLinkLabel}</Label>
                <Input
                  id="youtubeLinkInput"
                  value={youtubeLinkInput}
                  onChange={(e) => setYoutubeLinkInput(e.target.value)}
                  placeholder={T.youtubeLinkPlaceholder}
                  dir="ltr"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{T.cancelButton}</Button>
              </DialogClose>
              <Button onClick={handleSubmitAnswer} disabled={isSubmitting || !youtubeLinkInput}>
                {isSubmitting ? (
                  <>
                    <Loader2 className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4 animate-spin`} />
                    {T.submittingAnswerButton}
                  </>
                ) : (
                  <><Send className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} />{T.submitAnswerButton}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectedQuestion && dialogType === 'reject' && (
         <Dialog open={!!selectedQuestion && dialogType === 'reject'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
          <DialogContent dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
            {/* Visually hidden DialogTitle for accessibility */}
            <VisuallyHidden>
              <DialogTitle>{T.rejectionModalTitle}</DialogTitle>
            </VisuallyHidden>
            <DialogHeader>
              <DialogTitle>{T.rejectionModalTitle}</DialogTitle>
              <DialogDescription className="whitespace-pre-wrap py-2" dir="auto">
                <strong>{T.questionLabel}:</strong> {selectedQuestion.question_text}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="rejectionReasonInput">{T.rejectionReasonLabel}</Label>
                <Textarea
                  id="rejectionReasonInput"
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder={T.rejectionReasonPlaceholder}
                  dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'} 
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{T.cancelButton}</Button>
              </DialogClose>
              <Button onClick={handleSubmitRejection} disabled={isSubmitting} variant="destructive">
                {isSubmitting ? (
                  <>
                    <Loader2 className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4 animate-spin`} />
                    {T.submittingRejectionButton}
                  </>
                ) : (
                  <><Send className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4`} />{T.submitRejectionButton}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}