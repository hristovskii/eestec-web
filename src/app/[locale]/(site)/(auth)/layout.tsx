import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isEnabled } from '@/shared/config/flags';

// Member sign-in, sign-up and password pages. Phase 2: they do not exist while member accounts are
// off, and search engines never need them.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: LayoutProps<'/[locale]'>) {
  if (!isEnabled('phase2')) notFound();
  return children;
}
