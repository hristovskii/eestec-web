import { Clock } from 'lucide-react';

import { EventCard } from '@/features/events';
import type { Locale } from '@/shared/i18n/routing';
import { cn } from '@/shared/lib/cn';
import { StatusBadge } from '@/shared/ui/chip';

import type { UpcomingItem } from '../public-queries';
import { type CardLine, useApplyCopy } from './apply-copy';

/** The deadline row of an upcoming card (EventCard › deadline): grey, pink when closing soon. */
export function DeadlineLine({ line }: { line: CardLine }) {
  return (
    <span
      className={cn(
        'flex items-center gap-2 rounded-sm px-3 py-2.5 text-small',
        line.tone === 'urgent' ? 'bg-brand-tint font-bold text-brand-dark' : 'bg-surface font-medium',
        line.tone === 'muted' ? 'text-muted-ink' : line.tone === 'default' && 'text-ink',
      )}
    >
      <Clock className="size-4 shrink-0" aria-hidden />
      {line.text}
    </span>
  );
}

/** EventCard on /upcoming: status badge, deadline line and the call to action (UpcomingStates). */
export function UpcomingCard({ item, now, locale }: { item: UpcomingItem; now: string; locale: Locale }) {
  const copy = useApplyCopy(locale);
  const badge = copy.badge(item.apply, 'card');
  const line = copy.cardLine(item.apply, now);
  return (
    <EventCard
      event={item}
      locale={locale}
      href={`/upcoming/${item.slug}`}
      status={{
        badge: badge ? (
          <StatusBadge tone={badge.tone} overlay>
            {badge.label}
          </StatusBadge>
        ) : undefined,
        line: line ? <DeadlineLine line={line} /> : undefined,
        cta: copy.cardCta(item.apply),
      }}
    />
  );
}
