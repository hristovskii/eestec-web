import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { AuthCardSkeleton, AuthShell, LoginForm, safeNextPath } from '@/features/auth/public';
import { getSession } from '@/features/auth/server';
import { currentLocale } from '@/shared/i18n/current-locale';
import { redirect } from '@/shared/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.login');
  return { title: t('title') };
}

async function LoginContent({
  searchParams,
}: {
  searchParams: PageProps<'/[locale]/login'>['searchParams'];
}) {
  const [session, params, locale] = await Promise.all([getSession(), searchParams, currentLocale()]);
  const next = safeNextPath(params.next);
  // Signed in already: back to where they were going. A pending member stays and sees the notice.
  if (session && session.memberStatus !== 'pending') redirect({ href: next, locale });
  return <LoginForm pending={session?.memberStatus === 'pending'} next={next} />;
}

// /login (AuthPage): reads the session and `?next=`, so it streams in behind the card's loading state.
export default function LoginPage({ searchParams }: PageProps<'/[locale]/login'>) {
  return (
    <AuthShell>
      <Suspense fallback={<AuthCardSkeleton />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
