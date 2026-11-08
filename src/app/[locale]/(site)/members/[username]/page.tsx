import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import {
  MemberProfile,
  MembersSkeleton,
  PreviewBar,
  profileParamsSchema,
  RestrictedProfile,
} from '@/features/members/public';
import { getSession } from '@/features/auth/server';
import { MemoriesRow } from '@/features/memories/public';
import { getMemoriesOfAuthor } from '@/features/memories/server';
import { getAudience, getAuthorCards, getProfilePage, listPublicUsernames } from '@/features/members/server';
import { isEnabled } from '@/shared/config/flags';
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

// "Memories by …" (Phase 2): only for a profile the viewer may open in full; nothing when the person
// wrote none. The cards' author is this person, so one lookup serves them all.
async function ProfileMemories({
  userId,
  username,
  name,
  audience,
  locale,
}: {
  userId: string;
  username: string;
  name: string;
  audience: 'visitor' | 'member';
  locale: Locale;
}) {
  const [t, { items, total }, authors] = await Promise.all([
    getTranslations('memories.profileRow'),
    getMemoriesOfAuthor(userId, locale, 3),
    getAuthorCards(audience, locale, [userId]),
  ]);
  if (items.length === 0) return null;
  return (
    <MemoriesRow
      id="memories"
      headingLevel="h2"
      title={t('title', { name })}
      cards={items}
      authors={authors}
      locale={locale}
      link={
        total > items.length
          ? { href: `/memories?author=${username}`, label: t('all', { count: total }) }
          : undefined
      }
    />
  );
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
  // "See what visitors see" from /profile: the person's own page, as a visitor gets it.
  const wantsPreview = (Array.isArray(query.preview) ? query.preview[0] : query.preview) === 'visitor';
  const session = wantsPreview ? await getSession() : null;
  const preview = wantsPreview && session?.username === username;
  const audience = preview ? 'visitor' : await getAudience();
  const profile = await getProfilePage(audience, locale, username);
  if (!profile) notFound();
  return (
    <>
      {preview && <PreviewBar />}
      {profile.kind === 'restricted' ? (
        <RestrictedProfile profile={profile} />
      ) : (
        <MemberProfile
          profile={profile}
          params={profileParamsSchema.parse(query)}
          memories={
            isEnabled('phase2') ? (
              <ProfileMemories
                userId={profile.userId}
                username={profile.username}
                name={profile.name}
                audience={audience}
                locale={locale}
              />
            ) : undefined
          }
        />
      )}
    </>
  );
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
