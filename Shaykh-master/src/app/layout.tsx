import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AppShell from '@/components/layout/AppShell';
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";

// --- Site Metadata ---
const siteName = "Al-Sa'd Scholarly Portal";
const description = "Explore the works, lessons, and scholarly insights of Shaykh ʿAbdullāh ibn ʿAbd al-Raḥmān al-Saʿd. Access books, audio lectures, and ask questions.";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://your-alsad-portal.com"; // Fallback, set NEXT_PUBLIC_SITE_URL in .env

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: description,
  keywords: ["Abdullah al-Sa'd", "Shaykh al-Sa'd", "Islamic lectures", "Hadith", "Fiqh", "Aqidah", "Islamic books", "Salafi", "الشيخ عبد الله السعد", "دروس علمية", "حديث", "فقه", "عقيدة"],
  authors: [{ name: "Al-Sa'd Scholarly Portal Team" }], // Or the Shaykh's name if preferred
  creator: "Al-Sa'd Scholarly Portal Team",
  publisher: "Al-Sa'd Scholarly Portal",
  
  // Open Graph
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: siteName,
    description: description,
    siteName: siteName,
    images: [
      {
        url: `${siteUrl}/og-image.png`, // Create an og-image.png (e.g., 1200x630) in your /public folder
        width: 1200,
        height: 630,
        alt: `Logo of ${siteName}`,
      },
    ],
    locale: 'en_US', // Default locale
    alternateLocale: ['ar_SA'], // Arabic locale
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: siteName,
    description: description,
    // site: '@yourtwitterhandle', // Optional: Your Twitter handle
    // creator: '@yourtwitterhandle', // Optional: Creator's Twitter handle
    images: [`${siteUrl}/twitter-image.png`], // Create a twitter-image.png (e.g., 800x418 or similar ratio)
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Icons
  icons: {
    icon: '/favicon.ico', // Ensure favicon.ico exists in /public
    shortcut: '/favicon-16x16.png', // Ensure these exist in /public
    apple: '/apple-touch-icon.png', // Ensure this exists in /public
  },

  // Manifest (for PWA capabilities if desired)
  // manifest: '/manifest.json', // Create a manifest.json in /public

  // Other
  // verification: { // Example for Google Search Console
  //   google: 'your-google-site-verification-code',
  // },
  // appleWebApp: {
  //   title: siteName,
  //   statusBarStyle: 'default',
  //   capable: true,
  // },
  // formatDetection: {
  //   telephone: false,
  // },
  // assets: [`${siteUrl}/assets`], // If you have a dedicated assets CDN/path
  // category: 'education',
};

export const viewport: Viewport = {
  themeColor: [ // For PWA and browser UI theming
    { media: '(prefers-color-scheme: light)', color: '#5b758c' }, // Primary color for light
    { media: '(prefers-color-scheme: dark)', color: '#202A32' }, // A dark theme color (adjust based on your dark theme's --background or --primary)
  ],
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Optional: Can restrict zooming
  // userScalable: false, // Optional: Can prevent user zooming
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <LanguageProvider>
          <AuthProvider>
            <AppShell>
              {children}
            </AppShell>
            <Toaster />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
