import { ArrowRight } from 'lucide-react';
import type * as React from 'react';

import { Link } from '@/shared/i18n/navigation';
import type { Locale } from '@/shared/i18n/routing';
import { cn } from '@/shared/lib/cn';

import type { MemoryAuthor, MemoryCardModel } from '../../types';
import { MemoryCard } from './memory-card';

/**
 * A heading row and up to three Memory cards: Home › Latest activity, an event page ("Memories from
 * this event") and a member's profile ("Memories by …"). `swipe`: on a phone the cards scroll
 * sideways (Home-Mobile) instead of stacking.
 */
export function MemoriesRow({
  title,
  headingLevel = 'h3',
  cards,
  authors,
  locale,
  link,
  action,
  swipe,
  id,
}: {
  title: React.ReactNode;
  headingLevel?: 'h2' | 'h3';
  cards: MemoryCardModel[];
  authors: Record<string, MemoryAuthor>;
  locale: Locale;
  /** Right of the title: "Read all Memories". */
  link?: { href: string; label: string; shortLabel?: string };
  /** After the title row, e.g. "Share your story". */
  action?: React.ReactNode;
  swipe?: boolean;
  id?: string;
}) {
  if (cards.length === 0) return null;
  const Heading = headingLevel;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <Heading
          id={id}
          className={headingLevel === 'h2' ? 'text-[26px] leading-[1.25] font-bold' : 'type-h3'}
        >
          {title}
        </Heading>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {link && (
            <Link
              href={link.href}
              className="inline-flex min-h-10 items-center gap-1.5 text-small font-medium text-brand-dark no-underline hover:text-brand hover:underline lg:text-body"
            >
              {link.shortLabel ? (
                <>
                  <span className="lg:hidden">{link.shortLabel}</span>
                  <span className="max-lg:hidden">{link.label}</span>
                </>
              ) : (
                link.label
              )}
              <ArrowRight className="size-4 max-lg:hidden" aria-hidden />
            </Link>
          )}
          {action}
        </div>
      </div>
      <ul
        className={cn(
          'm-0 list-none p-0',
          swipe
            ? 'relative flex w-full min-w-0 snap-x gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible'
            : 'grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3',
        )}
      >
        {cards.map((memory) => (
          <li
            key={memory.id}
            className={cn(swipe && 'flex w-[300px] shrink-0 snap-start lg:w-auto lg:min-w-0 [&>*]:w-full')}
          >
            <MemoryCard
              memory={memory}
              author={memory.authorId ? authors[memory.authorId] : undefined}
              locale={locale}
              headingLevel="h3"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
