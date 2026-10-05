import '@/shared/styles/globals.css';

import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import { SITE_URL } from '@/shared/config/site';
import { roboto } from '@/shared/styles/fonts';
import { Toaster } from '@/shared/ui/primitives/sonner';
import { DevToolbarSlot } from '@/features/devtools/server';
import { Suspense } from 'react';

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: { default: 'Admin · EESTEC LC Skopje', template: '%s · Admin · EESTEC LC Skopje' },
  robots: { index: false, follow: false },
};

// Admin root layout: English-only (D13), denser controls (data-density="compact").
export default async function AdminRootLayout({ children }: LayoutProps<'/admin'>) {
  const messages = await getMessages();
  return (
    <html lang="en" className={roboto.variable}>
      <body data-density="compact" className="bg-surface">
        <NextIntlClientProvider
          messages={{ common: messages.common, ui: messages.ui, admin: messages.admin }}
        >
          {children}
          <Toaster />
          <Suspense fallback={null}>
            <DevToolbarSlot />
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
