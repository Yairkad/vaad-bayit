import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Toaster } from "@/components/ui/sonner";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import "../globals.css";

export const metadata: Metadata = {
  title: "ועד בית - מערכת ניהול",
  description: "מערכת חינמית לניהול ועד בית - מעקב תשלומים, ניהול דיירים, הודעות ומסמכים. הכל במקום אחד!",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ועד בית",
  },
  openGraph: {
    title: "ועד בית - מערכת ניהול",
    description: "מערכת חינמית לניהול ועד בית - מעקב תשלומים, ניהול דיירים, הודעות ומסמכים",
    type: "website",
    locale: "he_IL",
    siteName: "ועד בית",
  },
  twitter: {
    card: "summary",
    title: "ועד בית - מערכת ניהול",
    description: "מערכת חינמית לניהול ועד בית",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as typeof routing.locales[number])) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Get messages for client components
  const messages = await getMessages();

  // Determine text direction
  const dir = locale === 'he' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body className="antialiased min-h-screen bg-background font-sans">
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          דלג לתוכן הראשי
        </a>
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster />
          <OfflineIndicator />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
