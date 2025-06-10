import type { Metadata } from "next";
import config from "@/config";
import "./globals.css";
import { GoogleTagManager } from '@next/third-parties/google'
import { OpenPanelComponent } from '@openpanel/nextjs';
import { SessionProvider } from "next-auth/react"
import { Toaster } from '@/components/ui/toaster';
import FooterWrapper from "@/components/ui/FooterWrapper";
import { ReactNode } from 'react';
import StagewiseProvider from '@/components/dev/StagewiseProvider';
import { ThemeProvider } from '@/hooks/use-theme';
import { StagingBanner } from '@/components/staging/StagingBanner';
import { SkipLinks, commonSkipLinks } from '@/components/ui/skip-links';
import { QueryProvider } from '@/components/providers/QueryProvider';

export const metadata: Metadata = config.metadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#FFFFFF" />
      </head>
      <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
        <body
          className="antialiased min-h-screen flex flex-col transition-colors duration-300"
        >
          <ThemeProvider defaultTheme="system" storageKey="sambatv-theme">
            <QueryProvider>
              {/* Skip navigation links for keyboard users */}
              <SkipLinks links={commonSkipLinks.default} />
              
              <StagingBanner />
              <Toaster />
              <StagewiseProvider />
              <main id="main-content" className="flex-grow" role="main" aria-label="Main content">
                {children}
              </main>
              <FooterWrapper />
            </QueryProvider>
          </ThemeProvider>
        </body>
      </SessionProvider>
      {/* Google Tag Manager */}
      {process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID && (
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID} />
      )}
      
      {/* OpenPanel Analytics */}
      {process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID && (
        <OpenPanelComponent
          clientId={process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID}
          trackScreenViews={true}
          // trackAttributes={true}
          // trackOutgoingLinks={true}
          // If you have a user id, you can pass it here to identify the user
          // profileId={'123'}
        />
      )}
    </html>
  );
}
