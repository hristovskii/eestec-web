import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { requireMember } from '@/features/auth/server';
import { getStartedEvents } from '@/features/events/server';
import { MemoryEditorPage } from '@/features/memories/public';
import { getMyMemoryForEditor } from '@/features/memories/server';
import { notFound } from 'next/navigation';
import { currentLocale } from '@/shared/i18n/current-locale';
import { redirect } from '@/shared/i18n/navigation';
import { Container } from '@/shared/ui/container';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('memories.editor');
  // Private page: never listed by search engines.
  return { title: t('titleNew'), robots: { index: false, follow: false } };
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

async function Editor({
  searchParams,
}: {
  searchParams: PageProps<'/[locale]/memories/new'>['searchParams'];
}) {
  const [locale, query] = await Promise.all([currentLocale(), searchParams]);
  const draft = first(query.draft);
  const session = await requireMember(locale, draft ? `/memories/new?draft=${draft}` : '/memories/new');
  // A person still waiting for the board has no Memories to write yet: back to their profile.
  if (session.memberStatus === 'pending') redirect({ href: '/profile', locale });
  const own = draft ? await getMyMemoryForEditor(session.userId, { id: draft }) : null;
  if (draft && !own) notFound();
  // Waiting Memories are read-only and published ones are edited at their own address.
  if (own?.record.status === 'pending' && own.record.slug)
    redirect({ href: `/memories/${own.record.slug}`, locale });
  if (own?.record.status === 'published' && own.record.slug)
    redirect({ href: `/memories/${own.record.slug}/edit`, locale });
  const events = await getStartedEvents(locale);
  const wanted = first(query.event);
  return (
    <MemoryEditorPage
      own={own}
      events={events.map((event) => ({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        city: event.city,
        country: event.country,
      }))}
      preselectEventId={events.find((event) => event.slug === wanted)?.id ?? null}
    />
  );
}

// /memories/new (MemoryEditor): a member writes a Memory. Drafts open with ?draft=<id>.
export default function NewMemoryRoute({ searchParams }: PageProps<'/[locale]/memories/new'>) {
  return (
    <Container className="pt-0">
      <Suspense fallback={<div aria-hidden className="min-h-[70vh]" />}>
        <Editor searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
