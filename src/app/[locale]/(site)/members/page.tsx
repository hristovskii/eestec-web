import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getSession } from '@/features/auth/server';
import {
  ALUMNI_PREVIEW,
  joinedFilter,
  MEMBERS_PAGE_SIZE,
  MembersPage,
  membersParamsSchema,
  MembersSkeleton,
} from '@/features/members/public';
import { getAudience, getBoard, getProfile, listActiveMembers, listAlumni } from '@/features/members/server';
import { pageMetadata } from '@/features/settings/server';
import { currentLocale } from '@/shared/i18n/current-locale';
import type { Locale } from '@/shared/i18n/routing';
import { now } from '@/shared/lib/now';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const t = await getTranslations('members');
  return pageMetadata('members', locale, t('title'));
}

async function Members({
  searchParams,
  locale,
}: {
  searchParams: PageProps<'/[locale]/members'>['searchParams'];
  locale: Locale;
}) {
  const params = membersParamsSchema.parse(await searchParams);
  const [audience, session] = await Promise.all([getAudience(), getSession()]);
  const [board, active, alumni, own] = await Promise.all([
    getBoard(locale, params.board),
    listActiveMembers(audience, locale, {
      q: params.q,
      team: params.team,
      joined: joinedFilter(params.year),
      sort: params.sort,
      page: params.page,
      pageSize: MEMBERS_PAGE_SIZE,
    }),
    listAlumni(audience, locale, { q: params.aq, all: params.alumni === 'all' }, ALUMNI_PREVIEW),
    session && audience === 'member' ? getProfile('member', session.username) : null,
  ]);
  return (
    <MembersPage
      params={params}
      viewer={
        session && audience === 'member'
          ? {
              firstName: session.name.split(' ')[0] ?? session.name,
              initials: session.initials,
              visibility: own?.kind === 'full' ? own.profile.visibility : null,
            }
          : null
      }
      board={board}
      active={active}
      alumni={alumni}
      currentYear={now().getUTCFullYear()}
      teamName={active.teams.find((team) => team.slug === params.team)?.name}
    />
  );
}

// /members (MembersPage): the board, the active members and the alumni. Everything depends on who
// is looking and on the address, so it all streams in behind the designed loading state.
export default async function MembersRoute({ searchParams }: PageProps<'/[locale]/members'>) {
  const locale = await currentLocale();
  return (
    <Suspense fallback={<MembersSkeleton />}>
      <Members searchParams={searchParams} locale={locale} />
    </Suspense>
  );
}
