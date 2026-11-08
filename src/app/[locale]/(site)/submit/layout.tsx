import { notFound } from 'next/navigation';

import { isEnabled } from '@/shared/config/flags';

// Phase 2: ideas and impressions come with member accounts (and Memories), so /submit does not
// exist while those are off.
export default function SubmitLayout({ children }: LayoutProps<'/[locale]/submit'>) {
  if (!isEnabled('phase2')) notFound();
  return children;
}
