import type { Metadata } from "next";
import "../globals.css";
import { LocaleProvider } from "@/context/LocaleContext";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import ConciergeWidget from '@/components/concierge/ConciergeWidget';
import GlobalToast from '@/components/ui/GlobalToast';

export const metadata: Metadata = {
  title: "Azure Horizon",
  description: "Premium Tour Booking Platform",
  icons: {
    icon: '/favicon.svg',
  },
};

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head />
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <LocaleProvider>
            {children}
            <ConciergeWidget />
            <GlobalToast />
          </LocaleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
