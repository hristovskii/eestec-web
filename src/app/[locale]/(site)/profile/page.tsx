import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getMyApplications } from '@/features/applications/server';
import { AccountCard } from '@/features/auth/public';
import { requireMember } from '@/features/auth/server';
import { getJoin } from '@/features/join/server';
import { MyProfilePage, MyProfileSkeleton } from '@/features/members/public';
import { deleteMyAccount, getMyProfileView } from '@/features/members/server';
import { currentLocale } from '@/shared/i18n/current-locale';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('members.me');
  return { title: t('title') };
}

async function ProfileContent({
  searchParams,
}: {
  searchParams: PageProps<'/[locale]/profile'>['searchParams'];
}) {
  const [locale, query] = await Promise.all([currentLocale(), searchParams]);
  // Not signed in → /login?next=/profile; a board account without a member profile → home.
  const session = await requireMember(locale, '/profile');
  const [view, join, applications] = await Promise.all([
    getMyProfileView(session, locale),
    getJoin(locale),
    getMyApplications(session.email, locale),
  ]);
  if (!view) notFound();
  // The faculties are the board's list from Join Us, as at sign-up.
  return (
    <MyProfilePage
      view={view}
      faculties={join.apply.faculties.map((faculty) => faculty.label)}
      applications={applications}
      account={
        <AccountCard
          email={view.email}
          name={view.name}
          passwordAge={view.account.passwordAge}
          memoriesPublished={view.account.memoriesPublished}
          deleteAccount={deleteMyAccount}
          notice={emailNotice(query.email)}
        />
      }
    />
  );
}

// What the link of a new-address e-mail says (/auth/confirm sends people back with ?email=…).
const emailNotice = (value: string | string[] | undefined) => {
  const first = Array.isArray(value) ? value[0] : value;
  return first === 'changed' || first === 'expired' ? first : null;
};

// /profile (MyProfile): what a member edits about themselves. It depends on who is signed in.
export default function ProfileRoute({ searchParams }: PageProps<'/[locale]/profile'>) {
  return (
    <Suspense fallback={<MyProfileSkeleton />}>
      <ProfileContent searchParams={searchParams} />
    </Suspense>
  );
}
