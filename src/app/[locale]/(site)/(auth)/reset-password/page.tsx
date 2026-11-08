import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { AuthCardSkeleton, AuthShell, ResetForm } from '@/features/auth/public';
import { peekToken } from '@/features/auth/server';
import { currentLocale } from '@/shared/i18n/current-locale';
import { redirect } from '@/shared/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.reset');
  return { title: t('title') };
}

async function ResetContent({
  searchParams,
}: {
  searchParams: PageProps<'/[locale]/reset-password'>['searchParams'];
}) {
  const [params, locale] = await Promise.all([searchParams, currentLocale()]);
  const token = typeof params.token === 'string' ? params.token : '';
  const link = await peekToken(token, 'reset');
  // A link that is used, too old or made up leads to "This link has expired".
  if (link.state !== 'valid') redirect({ href: '/auth/expired?type=reset', locale });
  return (
    <ResetForm
      token={token}
      email={link.state === 'valid' ? link.email : ''}
      name={link.state === 'valid' ? link.name : ''}
    />
  );
}

// /reset-password?token= (AuthPage › reset): the link from the e-mail (30 minutes).
export default function ResetPasswordPage({ searchParams }: PageProps<'/[locale]/reset-password'>) {
  return (
    <AuthShell>
      <Suspense fallback={<AuthCardSkeleton />}>
        <ResetContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
