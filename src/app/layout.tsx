import type { Metadata } from 'next';
import { Manrope, Source_Serif_4 } from 'next/font/google';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { SITE, siteOrigin } from '@/lib/config';
import './globals.css';

const display = Source_Serif_4({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-display',
  display: 'swap',
});

const body = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: `${SITE.productName} — анализы товаров`,
    template: `%s · ${SITE.productName}`,
  },
  description: SITE.tagline,
  openGraph: {
    siteName: SITE.productName,
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <SiteHeader />
        <main className="shell page">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
