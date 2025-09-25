"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Home, User, Settings, Moon, Sun, Globe, MessageSquareQuote, Send, Facebook, Youtube, Twitter, Radio, Instagram, ScrollText, Menu as MenuIconLucide, PackageIcon, ArrowLeft, LayoutDashboard, MessageSquareText, Users as UsersIcon, BookOpen, Headphones, Library as LibraryIcon, Search as SearchIconLucide } from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import React, { useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Input } from '@/components/ui/input'; 
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/context/LanguageContext";

interface NavItem {
  href: string;
  labels: { en: string; ar: string };
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItemsList: NavItem[] = [
  { href: '/', labels: { en: 'Home', ar: 'الرئيسية' }, icon: Home },
  { href: '/biography', labels: { en: 'Biography', ar: 'السيرة الذاتية' }, icon: User },
  { href: '/library/books', labels: { en: 'Books & Collections', ar: 'الكتب والمجموعات' }, icon: BookOpen },
  { href: '/library/audio', labels: { en: 'Audio Library', ar: 'المكتبة الصوتية' }, icon: Headphones },
  { href: '/fatawa', labels: { en: 'Ask a Question', ar: 'إرسال سؤال' }, icon: MessageSquareQuote },
  { href: '/ijazat', labels: { en: "Shaykh's Ijazat", ar: 'إجازات الشيخ' }, icon: ScrollText },
];

const adminNavItemsList: NavItem[] = [
    { href: '/', labels: { en: 'Home', ar: 'الرئيسية' }, icon: Home },
    { href: '/admin/dashboard', labels: { en: 'Dashboard', ar: 'لوحة التحكم' }, icon: LayoutDashboard },
    { href: '/admin/manage-collections', labels: { en: 'Manage Collections', ar: 'إدارة المجموعات' }, icon: LibraryIcon },
    { href: '/admin/resources', labels: { en: 'Manage Resources', ar: 'إدارة الموارد' }, icon: PackageIcon },
    { href: '/admin/questions-management', labels: { en: 'Questions Management', ar: 'إدارة الأسئلة' }, icon: MessageSquareText },
    { href: '/admin/ijazat-management', labels: { en: 'Manage Ijazat', ar: 'إدارة الإجازات' }, icon: ScrollText },
    { href: '/admin/site-settings', labels: { en: 'Site Settings', ar: 'إعدادات الموقع' }, icon: Settings },
];

const ThemeToggle = () => {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState('light');
  const { currentLanguage } = useLanguage();

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem('theme') || 'light';
    setTheme(storedTheme);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'theme' && event.newValue) {
        setTheme(event.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('theme', theme);
    }
  }, [theme, mounted]);

  const toggleLabels = useMemo(() => ({
    en: { light: 'Switch to dark mode', dark: 'Switch to light mode' },
    ar: { light: 'التبديل إلى الوضع الداكن', dark: 'التبديل إلى الوضع الفاتح' }
  }), []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="w-8 h-8" disabled><Sun className="h-4 w-4" /></Button>;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-8 h-8"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      title={theme === 'light' ? toggleLabels[currentLanguage].light : toggleLabels[currentLanguage].dark}
    >
      {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  );
};

const LanguageToggle = () => {
  const [mounted, setMounted] = useState(false);
  const { currentLanguage, setLanguage } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  const langToggleLabels = useMemo(() => ({
    en: { title: "Change language", label: "Language" },
    ar: { title: "تغيير اللغة", label: "اللغة" }
  }), []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="w-8 h-8" disabled><Globe className="h-4 w-4" /></Button>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-8 h-8" title={langToggleLabels[currentLanguage].title}>
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{langToggleLabels[currentLanguage].label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setLanguage('en')} disabled={currentLanguage === 'en'}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('ar')} disabled={currentLanguage === 'ar'}>
          العربية (Arabic)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

function GlobalSearchInput() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { currentLanguage } = useLanguage();

  const searchPlaceholder = useMemo(() => ({
    en: "Search all content...",
    ar: "ابحث في كل المحتوى..."
  }), []);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xs hidden md:block">
      <SearchIconLucide className={`absolute ${currentLanguage === 'ar' ? 'right-3' : 'left-3'} top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground`} />
      <Input
        type="search"
        placeholder={searchPlaceholder[currentLanguage]}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={`${currentLanguage === 'ar' ? 'pr-10' : 'pl-10'} h-9`}
      />
    </form>
  );
}

function AppShellInternal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setOpen, isMobile: sidebarIsMobile, setOpenMobile } = useSidebar();
  const { currentLanguage } = useLanguage();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();
  const isMobile = useIsMobile();

  const socialLinksConstantList = [
    { href: 'https://t.me/Aaalsaad7', labels: { en: 'Arabic Telegram', ar: 'تيليجرام (عربي)' }, icon: Send, channel: 'ar' },
    { href: 'https://t.me/sh_alsa3d', labels: { en: 'English Telegram', ar: 'تيليجرام (إنجليزي)' }, icon: Send, channel: 'en' },
    { href: 'https://Fb.com/shalsa3d', labels: { en: 'Facebook', ar: 'فيسبوك' }, icon: Facebook },
    { href: 'https://YouTube.com/shalsa3d', labels: { en: 'YouTube', ar: 'يوتيوب' }, icon: Youtube },
    { href: 'https://Twitter.com/Shalsa3d', labels: { en: 'Twitter (X)', ar: 'تويتر (X)' }, icon: Twitter },
    { href: 'http://mixlr.com/shalsa3d', labels: { en: 'Mixlr Live Audio', ar: 'Mixlr بث مباشر' }, icon: Radio },
    { href: 'https://instagram.com/shalsa3d', labels: { en: 'Instagram', ar: 'انستجرام' }, icon: Instagram },
  ];

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (auth) {
      unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const portalTitles = useMemo(() => ({
    en: "Al-Sa'd Portal",
    ar: "بوابة السعد العلمية"
  }), []);
  
  const mobileMenuTitles = useMemo(() => ({ 
    en: "Portal Menu",
    ar: "قائمة البوابة"
  }), []);

  const siteLogoAltText = useMemo(() => ({
    en: "Al-Sa'd Scholarly Portal Logo",
    ar: "شعار بوابة السعد العلمية"
  }), []);
  
  const sidebarLogoAltText = useMemo(() => ({
    en: "Portal Menu Logo",
    ar: "شعار قائمة البوابة"
  }), []);

  const currentNavItems = useMemo(() => {
    const isAdminPath = pathname.startsWith('/admin');
    const items = isAdminPath ? adminNavItemsList : navItemsList;
    
    return items.map(item => ({
      ...item,
      label: item.labels[currentLanguage]
    }));
  }, [currentLanguage, pathname, currentUser]);

  const socialItems = useMemo(() => {
    return socialLinksConstantList.map(item => ({
      ...item,
      label: item.labels[currentLanguage]
    }));
  }, [currentLanguage]);

  const footerText = useMemo(() => ({
    en: `© 2025 Al-Sa'd Scholarly Portal. All rights reserved.`,
    ar: `© 2025 بوابة السعد العلمية. جميع الحقوق محفوظة.`
  }), []);

  const adminMenuTexts = useMemo(() => ({
    en: { dashboard: 'Admin Dashboard', login: 'Admin Login', srAdmin: 'Admin Panel' },
    ar: { dashboard: 'لوحة تحكم المسؤول', login: 'تسجيل دخول المسؤول', srAdmin: 'لوحة التحكم' }
  }), []);

  React.useEffect(() => {
    if (sidebarIsMobile) {
      setOpen(false);
      if (typeof setOpenMobile === 'function') setOpenMobile(false);
    }
  }, [pathname, sidebarIsMobile, setOpen, setOpenMobile]);

  return (
    <>
      <Sidebar
        className="border-r text-sidebar-foreground"
        dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
        side={currentLanguage === 'ar' ? 'right' : 'left'}
        mobileSheetClassName="bg-sidebar/85 backdrop-blur-md"
        collapsible={isMobile ? "offcanvas" : "none"}
      >
        <SidebarHeader className="p-4 border-b flex items-center justify-center">
          <Link href="/" className="flex items-center justify-center group-data-[collapsible=icon]:justify-center">
            <Image
              src="/Logo2.png"
              alt={sidebarLogoAltText[currentLanguage]}
              width={250}
              height={250}
              className="rounded"
              priority
            />
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {currentNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} passHref>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                    className="w-full justify-start"
                    onClick={() => {
                       if (sidebarIsMobile) {
                         setOpen(false);
                       }
                    }}
                  >
                    <div>
                      <item.icon className="h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </div>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-sidebar-border mt-auto">
          <div className="space-y-3 group-data-[collapsible=icon]:hidden">
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-2">
              {/* Special Ijazat Link - Styled to stand out */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="outline" size="icon" className="h-8 w-8 border-2 border-primary text-primary hover:text-primary hover:bg-primary/10">
                    <Link href="/ijazat">
                      <ScrollText className="h-5 w-5" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={currentLanguage === 'ar' ? 'left' : 'right'}>
                  <p>{currentLanguage === 'ar' ? 'إجازات الشيخ' : "Shaykh's Ijazat"}</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Regular Social Links */}
              {socialItems.map((item) => (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-accent hover:text-accent/80">
                      <Link href={item.href.startsWith('http') ? item.href : `https://${item.href}`} target="_blank" rel="noopener noreferrer">
                        <item.icon className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side={currentLanguage === 'ar' ? 'left' : 'right'}>
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            <p className="text-xs text-accent text-center">
              {footerText[currentLanguage]}
            </p>
          </div>
          <div className="hidden group-data-[collapsible=icon]:flex justify-center">
             <span className="text-sm text-accent">©</span>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 bg-background/80 backdrop-blur-md border-b md:px-6">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
              <Image
                src="/logo.png"
                alt={siteLogoAltText[currentLanguage]}
                width={300}
                height={300}
                className="h-12 w-12 rounded"
                priority
              />
              <span className="text-lg font-semibold font-headline text-primary hidden sm:block">
                {portalTitles[currentLanguage]}
              </span>
            </Link>
          </div>
          
          <div className="flex-1 flex justify-center px-4">
            <GlobalSearchInput />
          </div>

          <div className="flex items-center gap-1.5 md:gap-3">
            <SidebarTrigger className="md:hidden order-first" />
            <LanguageToggle />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full w-8 h-8">
                  <ScrollText className="h-5 w-5" />
                  <span className="sr-only">{adminMenuTexts[currentLanguage].srAdmin}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push('/admin/dashboard')}>
                    {adminMenuTexts[currentLanguage].dashboard}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
        <footer className="py-4 px-6 border-t text-center text-sm text-muted-foreground bg-background/80 backdrop-blur-sm" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
          {footerText[currentLanguage]}
        </footer>
      </SidebarInset>
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={true}>
        <AppShellInternal>{children}</AppShellInternal>
      </SidebarProvider>
    </TooltipProvider>
  );
}