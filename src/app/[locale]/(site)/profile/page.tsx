import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { requireMember } from '@/features/auth/server';
import { getJoin } from '@/features/join/server';
import { MyProfilePage, MyProfileSkeleton } from '@/features/members/public';
import { getMyProfileView } from '@/features/members/server';
import { currentLocale } from '@/shared/i18n/current-locale';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('members.me');
  return { title: t('title') };
}

async function ProfileContent() {
  const locale = await currentLocale();
  // Not signed in → /login?next=/profile; a board account without a member profile → home.
  const session = await requireMember(locale, '/profile');
  const [view, join] = await Promise.all([getMyProfileView(session, locale), getJoin(locale)]);
  if (!view) notFound();
  // The faculties are the board's list from Join Us, as at sign-up.
  return <MyProfilePage view={view} faculties={join.apply.faculties.map((faculty) => faculty.label)} />;
}

// /profile (MyProfile): what a member edits about themselves. It depends on who is signed in.
export default function ProfileRoute() {
  return (
    <Suspense fallback={<MyProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
