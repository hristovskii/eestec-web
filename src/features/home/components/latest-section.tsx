import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type * as React from 'react';

import { Link } from '@/shared/i18n/navigation';
import { Section } from '@/shared/ui/container';
import { SectionTitle } from '@/shared/ui/section-title';

/** A row of cards: three columns on a computer, a sideways swipe on a phone (Home-Mobile). */
function CardRow({ label, cards }: { label: string; cards: React.ReactNode[] }) {
  return (
    <ul
      aria-label={label}
      className="relative m-0 -mt-3 flex w-full min-w-0 snap-x list-none gap-4 overflow-x-auto p-0 pb-2 lg:mt-[-16px] lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible"
    >
      {cards.map((card, index) => (
        <li key={index} className="flex w-[300px] shrink-0 snap-start lg:w-auto lg:min-w-0 [&>*]:w-full">
          {card}
        </li>
      ))}
    </ul>
  );
}

/**
 * "What we've been up to" (Home › Latest activity): the newest past events, and the Memories row
 * when the page passes one (Phase 2). Each row hides itself when it has nothing to show.
 */
export function LatestSection({
  events,
  memories,
}: {
  /** EventCards of the newest past events. */
  events: React.ReactNode[];
  /** Phase 2: the Memories heading row and cards (M17). */
  memories?: React.ReactNode;
}) {
  const t = useTranslations('home.latest');
  if (events.length === 0 && !memories) return null;
  return (
    <Section tone="grey" aria-labelledby="home-latest">
      <div className="flex flex-col gap-6 lg:gap-10">
        <SectionTitle id="home-latest" eyebrow={t('eyebrow')} title={t('title')} />
        {events.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-4">
              <h3 className="type-h3">{t('pastEvents')}</h3>
              <Link
                href="/events"
                className="inline-flex min-h-10 items-center gap-1.5 text-small font-medium text-brand-dark no-underline hover:text-brand hover:underline lg:text-body"
              >
                <span className="lg:hidden">{t('viewAllShort')}</span>
                <span className="max-lg:hidden">{t('viewAll')}</span>
                <ArrowRight className="size-4 max-lg:hidden" aria-hidden />
              </Link>
            </div>
            <CardRow label={t('pastEvents')} cards={events} />
          </>
        )}
        {memories}
      </div>
    </Section>
  );
}
