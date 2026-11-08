import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { AuthCardSkeleton, AuthShell, PendingCard } from '@/features/auth/public';
import { getMemberRegistration, getSession } from '@/features/auth/server';
import { currentLocale } from '@/shared/i18n/current-locale';
import { formatDate } from '@/shared/i18n/format';
import { redirect } from '@/shared/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.pending');
  return { title: t('title') };
}

async function PendingContent() {
  const [session, locale] = await Promise.all([getSession(), currentLocale()]);
  if (!session) redirect({ href: '/login', locale });
  // Approved (or a board account): nothing to wait for.
  if (!session || session.memberStatus !== 'pending') redirect({ href: '/', locale });
  const registration = session ? await getMemberRegistration(session.userId) : null;
  const since = registration?.confirmedAt ?? registration?.submittedAt;
  return (
    <PendingCard
      firstName={session?.name.split(/\s+/)[0] ?? ''}
      since={since ? formatDate(since, locale, 'date') : ''}
    />
  );
}

// /register/pending (AuthPage › pending): where a new member lands after confirming the e-mail.
export default function PendingPage() {
  return (
    <AuthShell>
      <Suspense fallback={<AuthCardSkeleton />}>
        <PendingContent />
      </Suspense>
    </AuthShell>
  );
}
