import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isEnabled } from '@/shared/config/flags';

// Private pages: never listed by search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Phase 2: /profile does not exist while member accounts are off.
export default function ProfileLayout({ children }: LayoutProps<'/[locale]/profile'>) {
  if (!isEnabled('phase2')) notFound();
  return children;
}
