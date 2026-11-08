import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { requireMember } from '@/features/auth/server';
import { getStartedEvents } from '@/features/events/server';
import { MemoryEditorPage } from '@/features/memories/public';
import { getMyMemoryForEditor } from '@/features/memories/server';
import { currentLocale } from '@/shared/i18n/current-locale';
import { redirect } from '@/shared/i18n/navigation';
import { Container } from '@/shared/ui/container';

// The editor is per person and reads the session: nothing to prerender but the shell. At least one
// param is required under Cache Components, hence the placeholder (it 404s).
export function generateStaticParams() {
  return [{ slug: '__none__' }];
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('memories.editor');
  return { title: t('titleEdit'), robots: { index: false, follow: false } };
}

async function Editor({ params }: { params: PageProps<'/[locale]/memories/[slug]/edit'>['params'] }) {
  const [locale, { slug }] = await Promise.all([currentLocale(), params]);
  const session = await requireMember(locale, `/memories/${slug}/edit`);
  if (session.memberStatus === 'pending') redirect({ href: '/profile', locale });
  // Someone else's Memory, or none at that address: the same 404.
  const own = await getMyMemoryForEditor(session.userId, { slug });
  if (!own) notFound();
  // Waiting for the board: nothing to edit until they decide.
  if (own.record.status === 'pending') redirect({ href: `/memories/${slug}`, locale });
  const events = await getStartedEvents(locale);
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
      preselectEventId={null}
    />
  );
}

// /memories/[slug]/edit (MemoryEditor-Rejected, -LiveEdit): a Memory that was not approved is
// edited and resubmitted; a published one is edited and its changes go to the board.
export default function EditMemoryRoute({ params }: PageProps<'/[locale]/memories/[slug]/edit'>) {
  return (
    <Container className="pt-0">
      <Suspense fallback={<div aria-hidden className="min-h-[70vh]" />}>
        <Editor params={params} />
      </Suspense>
    </Container>
  );
}
