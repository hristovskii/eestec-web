import { notFound } from 'next/navigation';

import { isEnabled } from '@/shared/config/flags';

// Phase 2: the member pages do not exist while member accounts are off.
export default function MembersLayout({ children }: LayoutProps<'/[locale]/members'>) {
  if (!isEnabled('phase2')) notFound();
  return children;
}
