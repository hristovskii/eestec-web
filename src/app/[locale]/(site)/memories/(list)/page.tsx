import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getSession } from '@/features/auth/server';
import {
  MemoriesHero,
  MemoriesList,
  MemoriesListSkeleton,
  memoriesParamsSchema,
} from '@/features/memories/public';
import { getMemoriesFacets, getMemoriesList } from '@/features/memories/server';
import { getAudience, getAuthorCards } from '@/features/members/server';
import { pageMetadata } from '@/features/settings/server';
import { currentLocale } from '@/shared/i18n/current-locale';
import type { Locale } from '@/shared/i18n/routing';
import { Container } from '@/shared/ui/container';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const t = await getTranslations('memories');
  return pageMetadata('memories', locale, t('title'));
}

async function Memories({
  searchParams,
  locale,
}: {
  searchParams: PageProps<'/[locale]/memories'>['searchParams'];
  locale: Locale;
}) {
  const params = memoriesParamsSchema.parse(await searchParams);
  const [audience, session, facets] = await Promise.all([
    getAudience(),
    getSession(),
    getMemoriesFacets(locale),
  ]);
  // Authors come from `members` (what this viewer may see); filters and cards share the lookup.
  const facetAuthors = await getAuthorCards(
    audience,
    locale,
    facets.authors.map((author) => author.authorId),
  );
  const authorOptions = facets.authors.flatMap((author) => {
    const card = facetAuthors[author.authorId];
    return card?.username ? [{ username: card.username, name: card.name, count: author.count }] : [];
  });
  const authorId = params.author
    ? (facets.authors.find((author) => facetAuthors[author.authorId]?.username === params.author)?.authorId ??
      '__none__')
    : null;
  const eventId = params.event
    ? (facets.events.find((event) => event.slug === params.event)?.id ?? '__none__')
    : null;
  const page = await getMemoriesList(
    {
      q: params.q ?? '',
      eventId,
      year: params.year ?? null,
      place: params.place ?? null,
      authorId,
      sort: params.sort,
      page: params.page,
    },
    locale,
  );
  const authors = await getAuthorCards(
    audience,
    locale,
    page.items.flatMap((memory) => (memory.authorId ? [memory.authorId] : [])),
  );
  const member = session?.memberStatus === 'active' || session?.memberStatus === 'alumni';
  return (
    <>
      <MemoriesHero totals={facets.totals} member={member} />
      <Container className="py-8 pb-14 lg:py-10 lg:pb-24">
        <MemoriesList
          params={params}
          page={page}
          options={{
            events: facets.events.map((event) => ({
              slug: event.slug,
              title: event.title,
              count: event.count,
            })),
            years: facets.years,
            places: facets.places,
            authors: authorOptions,
          }}
          authors={authors}
          locale={locale}
          member={member}
        />
      </Container>
    </>
  );
}

// /memories (MemoriesList): the header and the list read who is signed in and the URL (filters,
// page), so they stream in behind the designed loading state.
export default async function MemoriesPage({ searchParams }: PageProps<'/[locale]/memories'>) {
  const locale = await currentLocale();
  return (
    <Suspense
      fallback={
        <>
          <div aria-hidden className="h-[300px] bg-surface lg:h-[320px]" />
          <Container className="py-8 pb-14 lg:pb-24">
            <MemoriesListSkeleton />
          </Container>
        </>
      }
    >
      <Memories searchParams={searchParams} locale={locale} />
    </Suspense>
  );
}
