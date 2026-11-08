import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { AuthCardSkeleton, AuthShell, ExpiredFlow } from '@/features/auth/public';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.expired');
  return { title: t('title') };
}

async function ExpiredContent({
  searchParams,
}: {
  searchParams: PageProps<'/[locale]/auth/expired'>['searchParams'];
}) {
  const params = await searchParams;
  return <ExpiredFlow type={params.type === 'confirm' ? 'confirm' : 'reset'} />;
}

// /auth/expired?type=confirm|reset (AuthPage › expired): ask for a new link.
export default function ExpiredPage({ searchParams }: PageProps<'/[locale]/auth/expired'>) {
  return (
    <AuthShell>
      <Suspense fallback={<AuthCardSkeleton />}>
        <ExpiredContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
