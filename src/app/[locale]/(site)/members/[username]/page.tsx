import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import {
  MemberProfile,
  MembersSkeleton,
  profileParamsSchema,
  RestrictedProfile,
} from '@/features/members/public';
import { getAudience, getProfilePage, listPublicUsernames } from '@/features/members/server';
import { currentLocale } from '@/shared/i18n/current-locale';
import type { Locale } from '@/shared/i18n/routing';

// Public profiles get their page shell at build time; everyone else renders on the first visit. At
// least one param is required under Cache Components, hence the placeholder (it 404s).
export async function generateStaticParams() {
  const usernames = await listPublicUsernames();
  return usernames.length > 0 ? usernames.map((username) => ({ username })) : [{ username: '__none__' }];
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/members/[username]'>): Promise<Metadata> {
  const { username } = await params;
  const locale = await currentLocale();
  // What a visitor may see decides the title and whether search engines may list the page: a
  // members-only profile is never indexed, and neither is an address that does not exist.
  const profile = await getProfilePage('visitor', locale, username);
  const t = await getTranslations('members');
  if (!profile) return { title: t('title'), robots: { index: false, follow: false } };
  return {
    title: `${profile.name} · ${t('title')}`,
    ...(profile.kind === 'restricted' ? { robots: { index: false, follow: false } } : {}),
  };
}

async function Profile({
  params,
  searchParams,
  locale,
}: {
  params: PageProps<'/[locale]/members/[username]'>['params'];
  searchParams: PageProps<'/[locale]/members/[username]'>['searchParams'];
  locale: Locale;
}) {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const audience = await getAudience();
  const profile = await getProfilePage(audience, locale, username);
  if (!profile) notFound();
  if (profile.kind === 'restricted') return <RestrictedProfile profile={profile} />;
  return <MemberProfile profile={profile} params={profileParamsSchema.parse(query)} />;
}

// /members/<username> (MemberProfile, -Restricted): what the viewer may see is decided in the data
// layer (visibility rule); unknown, hidden and inactive people are a 404.
export default async function MemberProfileRoute({
  params,
  searchParams,
}: PageProps<'/[locale]/members/[username]'>) {
  const locale = await currentLocale();
  return (
    <Suspense fallback={<MembersSkeleton />}>
      <Profile params={params} searchParams={searchParams} locale={locale} />
    </Suspense>
  );
}
