import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { AuthCardSkeleton, AuthShell, ForgotFlow } from '@/features/auth/public';
import { getSession } from '@/features/auth/server';
import { currentLocale } from '@/shared/i18n/current-locale';
import { redirect } from '@/shared/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.forgot');
  return { title: t('title') };
}

async function ForgotContent() {
  const [session, locale] = await Promise.all([getSession(), currentLocale()]);
  if (session) redirect({ href: '/', locale });
  return <ForgotFlow />;
}

// /forgot-password (AuthPage › forgot, sent): for people who are not logged in.
export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<AuthCardSkeleton />}>
        <ForgotContent />
      </Suspense>
    </AuthShell>
  );
}
