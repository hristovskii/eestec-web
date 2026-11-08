import { notFound } from 'next/navigation';

import { isEnabled } from '@/shared/config/flags';

// Phase 2: Memories need member accounts, so they do not exist while those are off.
export default function MemoriesLayout({ children }: LayoutProps<'/[locale]/memories'>) {
  if (!isEnabled('phase2')) notFound();
  return children;
}
