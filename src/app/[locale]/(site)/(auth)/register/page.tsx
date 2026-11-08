import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { AuthCardSkeleton, AuthShell, RegisterFlow } from '@/features/auth/public';
import { getSession } from '@/features/auth/server';
import { getJoin } from '@/features/join/server';
import { getSiteSettings } from '@/features/settings/server';
import { currentLocale } from '@/shared/i18n/current-locale';
import { redirect } from '@/shared/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.register');
  return { title: t('title') };
}

async function RegisterContent() {
  const locale = await currentLocale();
  const [session, join, settings] = await Promise.all([
    getSession(),
    getJoin(locale),
    getSiteSettings(locale),
  ]);
  // Signed in: a pending member goes to the waiting page, everyone else home.
  if (session) redirect({ href: session.memberStatus === 'pending' ? '/register/pending' : '/', locale });
  // The faculties are the board's list from Join Us (Admin › Pages › Join Us).
  return (
    <RegisterFlow
      faculties={join.apply.faculties.map((faculty) => faculty.label)}
      siteName={settings.siteName}
    />
  );
}

// /register (AuthPage › register): for people who are already members; the board checks every account.
export default function RegisterPage() {
  return (
    <AuthShell wide>
      <Suspense fallback={<AuthCardSkeleton />}>
        <RegisterContent />
      </Suspense>
    </AuthShell>
  );
}
