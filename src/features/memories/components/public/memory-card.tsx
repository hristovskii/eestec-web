import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatDate } from '@/shared/i18n/format';
import type { Locale } from '@/shared/i18n/routing';
import { InitialsAvatar } from '@/shared/ui/cards';
import { Chip } from '@/shared/ui/chip';
import { MediaCard, MediaCardMeta } from '@/shared/ui/media-card';

import type { MemoryAuthor, MemoryCardModel } from '../../types';

/** "Marija Stojanovska", "A former member", or "A member" when the author can't be found. */
export function authorName(
  memory: Pick<MemoryCardModel, 'authorDeleted'>,
  author: MemoryAuthor | undefined,
  labels: { former: string; unknown: string },
) {
  if (memory.authorDeleted) return labels.former;
  return author?.name ?? labels.unknown;
}

/**
 * The Memory card (MemoriesList, Home, event page, profile): the shared card with the event's type,
 * the event and place line, the first lines of the story and the author. No status badge: only
 * published Memories are cards.
 */
export function MemoryCard({
  memory,
  author,
  locale,
  headingLevel,
}: {
  memory: MemoryCardModel;
  /** From `members`; undefined for a former member (or an author that can't be found). */
  author?: MemoryAuthor | undefined;
  locale: Locale;
  headingLevel?: 'h2' | 'h3';
}) {
  const t = useTranslations('memories.card');
  const former = memory.authorDeleted;
  const name = authorName(memory, author, { former: t('formerMember'), unknown: t('unknownAuthor') });
  const initials = former ? '?' : (author?.initials ?? '?');
  return (
    <MediaCard
      href={`/memories/${memory.slug}`}
      title={memory.title}
      cover={memory.cover}
      ctaLabel={t('read')}
      headingLevel={headingLevel}
      chips={memory.event.typeName ? <Chip size="sm">{memory.event.typeName}</Chip> : undefined}
    >
      <div className="flex flex-col gap-2.5">
        <MediaCardMeta icon={<MapPin />}>
          <span>
            <strong className="font-bold text-ink" lang={memory.event.titleLang ?? undefined}>
              {memory.event.title}
            </strong>
            {memory.place && ` · ${memory.place}`}
          </span>
        </MediaCardMeta>
        {memory.excerpt && <p className="line-clamp-3 text-small text-ink-2">{memory.excerpt}</p>}
        <div className="mt-1 flex items-center gap-2.5">
          <InitialsAvatar initials={initials} tone={former ? 'grey' : 'dark'} />
          <span className="flex min-w-0 flex-col text-small leading-tight">
            <span className="truncate font-medium text-ink">{name}</span>
            <span className="text-muted-ink">{formatDate(memory.publishedAt, locale, 'date')}</span>
          </span>
        </div>
      </div>
    </MediaCard>
  );
}
