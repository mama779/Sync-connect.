import type {Metadata, Viewport} from 'next';
import './globals.css';
import {Toaster} from '@/components/ui/toaster';
import { LanguageProvider } from '@/components/language-context';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/theme-context';
import { FloatingContact } from '@/components/floating-contact';
import { PermissionsHandler } from '@/components/permissions-handler';
import { DynamicBrandingHandler } from '@/components/dynamic-branding-handler';
import Script from 'next/script';

export const revalidate = 0;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const FAVICON_URL = "/favicon.png";

export const metadata: Metadata = {
  title: 'Sync Connect',
  description: 'Infraestructura tecnológica profesional para gestión comercial y ventas.',
  icons: {
    icon: FAVICON_URL,
    apple: FAVICON_URL,
  },
  other: {
    "google-adsense-account": "ca-pub-6814710406743843",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <Script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6814710406743843"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="font-body antialiased bg-[#EAEDED] text-foreground selection:bg-primary/20">
        <FirebaseClientProvider>
          <DynamicBrandingHandler />
          <ThemeProvider>
            <LanguageProvider>
              <PermissionsHandler />
              {children}
              <FloatingContact />
              <Toaster />
            </LanguageProvider>
          </ThemeProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
