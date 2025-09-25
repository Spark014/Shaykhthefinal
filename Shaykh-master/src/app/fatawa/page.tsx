
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";
import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

const questionCategories = [
  { value: "aqidah", en: "Aqidah", ar: "عقيدة" },
  { value: "ahadith", en: "Ahadith & Sunnah", ar: "حديث وسنة" },
  { value: "family", en: "Family Matters", ar: "شؤون الأسرة" },
  { value: "business", en: "Business & Transactions", ar: "المعاملات التجارية" },
  { value: "prayer", en: "Prayer & Worship", ar: "الصلاة والعبادات" },
  { value: "miscellaneous", en: "Miscellaneous", ar: "متفرقات" },
];

const basePageTexts = {
  en: {
    title: "Ask a Question",
    description: "Submit your question. Please provide a valid email. Questions are saved to our database for review by the Shaykh. Your question must be in Arabic.",
    emailLabel: "Email Address",
    emailPlaceholder: "your.email@example.com",
    categoryLabel: "Question Category",
    categoryPlaceholder: "Select a category",
    questionLabel: "Your Question (Arabic Only)",
    questionPlaceholder: "اكتب سؤالك هنا باللغة العربية...",
    questionDescription: "IMPORTANT: Your question must be written entirely in Arabic and be at least 10 characters long. Submissions with English letters will be rejected.",
    submitButton: "Submit Question",
    submittingButton: "Submitting...",
    toastTitleSuccess: "Question Submitted",
    toastDescriptionSuccess: "Your question has been submitted successfully. JazakAllah Khair.",
    toastErrorTitle: "Submission Error",
    toastDescriptionErrorGeneric: "Could not submit your question. Please try again later.",
    supabaseError: "A database error occurred. Please ensure the form is filled correctly and try again. If the problem persists, the service might be temporarily unavailable or misconfigured.",
    validation: {
        invalidEmail: "Invalid email address.",
        selectCategory: "Please select a category.",
        questionMinLength: "Question must be at least 10 Arabic characters.",
        questionArabicOnly: "Question must be in Arabic only. English letters are not allowed.",
    }
  },
  ar: {
    title: "إرسال سؤال",
    description: "أرسل سؤالك. يُرجى إدخال بريد إلكتروني صالح. تُحفَظ الأسئلة في قاعدة البيانات لمراجعتها من قِبل الشيخ. يجب أن يكون سؤالك باللغة العربية.",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "your.email@example.com",
    categoryLabel: "فئة السؤال",
    categoryPlaceholder: "اختر فئة",
    questionLabel: "سؤالك (باللغة العربية فقط)",
    questionPlaceholder: "اكتب سؤالك هنا باللغة العربية...",
    questionDescription: "هام: يجب كتابة سؤالك بالكامل باللغة العربية وأن لا يقل عن ١٠ أحرف. سيتم رفض الأسئلة التي تحتوي على أحرف إنجليزية.",
    submitButton: "إرسال السؤال",
    submittingButton: "جارٍ الإرسال...",
    toastTitleSuccess: "تم إرسال السؤال",
    toastDescriptionSuccess: "تم إرسال سؤالك بنجاح. جزاك الله خيراً.",
    toastErrorTitle: "خطأ في الإرسال",
    toastDescriptionErrorGeneric: "لم نتمكن من إرسال سؤالك. يرجى المحاولة مرة أخرى لاحقاً.",
    supabaseError: "حدث خطأ في قاعدة البيانات. يُرجى التأكد من ملء النموذج بشكل صحيح والمحاولة مرة أخرى. إذا استمرت المشكلة، قد تكون الخدمة غير متاحة مؤقتاً أو هناك خطأ في الإعدادات.",
    validation: {
        invalidEmail: "البريد الإلكتروني غير صالح.",
        selectCategory: "يرجى اختيار فئة.",
        questionMinLength: "يجب أن لا يقل السؤال عن ١٠ أحرف عربية.",
        questionArabicOnly: "يجب أن يكون السؤال باللغة العربية فقط. الحروف الإنجليزية غير مسموح بها.",
    }
  },
};

const createFormSchema = (T_validation: typeof basePageTexts.en.validation) => z.object({
  email: z.string().email({ message: T_validation.invalidEmail }),
  category: z.string().min(1, { message: T_validation.selectCategory }),
  question_text: z.string()
    .min(10, { message: T_validation.questionMinLength })
    .refine(value => !/[a-zA-Z]/.test(value), { // Basic check for no English letters
      message: T_validation.questionArabicOnly,
    }),
});

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

export default function AskQuestionPage() {
  const { toast } = useToast();
  const { currentLanguage } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const T = useMemo(() => basePageTexts[currentLanguage], [currentLanguage]);
  const currentSchema = useMemo(() => createFormSchema(T.validation), [T.validation]);

  const form = useForm<FormValues>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      email: "",
      category: "",
      question_text: "",
    },
    mode: "onChange", // Validate on change for better UX
  });

  useEffect(() => {
    if (form.formState.isSubmitted || Object.keys(form.formState.touchedFields).length > 0) {
        form.trigger();
    }
  }, [currentLanguage, form, currentSchema]);


  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      if (!supabase) {
        throw new Error("Supabase client is not initialized.");
      }
      const { error } = await supabase
        .from('questions') 
        .insert([
          {
            email: values.email,
            category: values.category,
            question_text: values.question_text,
          }
        ]);

      if (error) throw error;

      toast({
        title: T.toastTitleSuccess,
        description: T.toastDescriptionSuccess,
      });
      form.reset();
    } catch (caughtError: any) {
      let consoleErrorMessageParts: string[] = ["Error submitting question to Supabase."];
      let toastDisplayMessage = T.toastDescriptionErrorGeneric;
      let toastErrorCode = "";
      const pgError = caughtError as Partial<PostgrestError>; // Type assertion

      if (pgError.message) consoleErrorMessageParts.push(`Message: "${pgError.message}"`);
      if (pgError.details) consoleErrorMessageParts.push(`Details: "${pgError.details}"`);
      if (pgError.hint) {
          consoleErrorMessageParts.push(`Hint: "${pgError.hint}"`);
          if (pgError.hint.toLowerCase().includes("rls") || pgError.hint.toLowerCase().includes("policy")) {
              toastDisplayMessage = T.supabaseError + " Possible RLS issue.";
          } else if (pgError.hint.toLowerCase().includes("check constraint") || (pgError.message && pgError.message.toLowerCase().includes("check constraint"))) {
              if (pgError.message && pgError.message.includes('question_text_min_length')) {
                toastDisplayMessage = T.validation.questionMinLength;
              } else if (pgError.message && pgError.message.includes('question_text_check')) { // Assuming your Arabic-only check constraint name involves 'question_text_check'
                toastDisplayMessage = T.validation.questionArabicOnly;
              } else {
                toastDisplayMessage = T.supabaseError + " Check constraint violation.";
              }
          }
      }
      if (pgError.code) {
          consoleErrorMessageParts.push(`Code: "${pgError.code}"`);
          toastErrorCode = ` (Code: ${pgError.code})`;
          if (pgError.code === '23514') { // Check constraint violation code
            // More specific error message if possible, based on constraint name in pgError.message
            if (pgError.message && pgError.message.includes('question_text_min_length')) {
                toastDisplayMessage = T.validation.questionMinLength;
            } else if (pgError.message && pgError.message.includes('question_text_check')) { // Adapt if your Arabic-only constraint name is different
                toastDisplayMessage = T.validation.questionArabicOnly;
            } else {
                toastDisplayMessage = T.supabaseError + " A data validation rule was violated.";
            }
          } else if (pgError.code === '42501') { // RLS violation
            toastDisplayMessage = T.supabaseError + " Submission blocked by security policy (RLS). This could be due to invalid input (e.g. English characters).";
          }
      }

      if(consoleErrorMessageParts.length === 1 && !(caughtError instanceof Error && caughtError.message)) {
        // If it's not a PostgrestError and not a generic Error with a message, use a fallback.
        toastDisplayMessage = T.supabaseError;
      } else if (caughtError instanceof Error && caughtError.message) {
         // For generic JS errors
         consoleErrorMessageParts.push(`Generic Error Message: "${caughtError.message}"`);
         if (toastDisplayMessage === T.toastDescriptionErrorGeneric) toastDisplayMessage = caughtError.message;
      }

      const consoleErrorMessage = consoleErrorMessageParts.join(" ");
      console.error(consoleErrorMessage); // Log detailed error to console
      console.debug("Full question submission error object for inspection (browser console):", caughtError); // Log raw object for deeper inspection


      toast({
        title: T.toastErrorTitle,
        description: `${toastDisplayMessage}${toastErrorCode}`,
        variant: "destructive",
        duration: 8000
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <header className="text-center py-8">
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4 font-headline">
          {T.title}
        </h1>
        <p className="text-lg text-muted-foreground">
          {T.description}
        </p>
      </header>

      <Card className="shadow-xl">
        <CardContent className="p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T.emailLabel}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={T.emailPlaceholder}
                        {...field}
                        dir="ltr"
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T.categoryLabel}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || ""} dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={T.categoryPlaceholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {questionCategories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat[currentLanguage as 'en' | 'ar']}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="question_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T.questionLabel}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={T.questionPlaceholder}
                        className="min-h-[150px] resize-y"
                        {...field}
                        lang="ar" 
                        dir="rtl" 
                      />
                    </FormControl>
                    <FormDescription className="text-amber-700 dark:text-amber-500">
                      {T.questionDescription}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className={`${currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} h-4 w-4 animate-spin`} />
                    {T.submittingButton}
                  </>
                ) : (
                  T.submitButton
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
