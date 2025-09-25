"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('ar');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize language from localStorage on mount
    const storedLang = (localStorage.getItem('language') as Language) || 'ar';
    setCurrentLanguage(storedLang);
    setIsInitialized(true);

    // Apply language settings to document
    if (typeof window !== 'undefined') {
      document.documentElement.lang = storedLang;
      document.documentElement.dir = storedLang === 'ar' ? 'rtl' : 'ltr';
    }

    // Listen for storage changes (language changes in other tabs)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'language' && event.newValue && (event.newValue === 'en' || event.newValue === 'ar')) {
        const newLang = event.newValue as Language;
        setCurrentLanguage(newLang);
        if (typeof window !== 'undefined') {
          document.documentElement.lang = newLang;
          document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
    localStorage.setItem('language', lang);
    
    if (typeof window !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }

    // Trigger storage event to notify other components/tabs
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'language',
      newValue: lang,
      oldValue: currentLanguage,
    }));
  };

  const toggleLanguage = () => {
    const newLang = currentLanguage === 'en' ? 'ar' : 'en';
    setLanguage(newLang);
  };

  // Don't render children until language is initialized to prevent hydration issues
  if (!isInitialized) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
