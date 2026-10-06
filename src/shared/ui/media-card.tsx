import { ArrowRight } from 'lucide-react';
import * as React from 'react';

import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';
import type { AnyMedia } from '@/shared/types/media';

import { MediaImage } from './media-image';
import { Skeleton } from './primitives/skeleton';

type MediaCardProps = {
  href: string;
  title: string;
  cover: AnyMedia | null;
  ctaLabel: string;
  /** Top-left overlay: StatusBadge. */
  badge?: React.ReactNode;
  /** Bottom-left overlay: "Organized by LC Skopje". */
  cornerBadge?: React.ReactNode;
  /** Chips above the title (type, scope). */
  chips?: React.ReactNode;
  /** Rows under the title: date / location, event line, excerpt, author… */
  children?: React.ReactNode;
  /** Heading level inside lists (h2 when the list has no section heading). */
  headingLevel?: 'h2' | 'h3';
  /** Language of the title when it falls back to Macedonian on an English page. */
  titleLang?: string;
};

/**
 * The one card from Main › Cards: white, radius 12, soft shadow, 16:10 image on top, title
 * clamped to 2 lines, red CTA at the bottom. Hover: red ring, 4 px lift, red title.
 * EventCard and MemoryCard (features) are built on it.
 */
export function MediaCard({
  href,
  title,
  cover,
  ctaLabel,
  badge,
  cornerBadge,
  chips,
  children,
  headingLevel = 'h3',
  titleLang,
}: MediaCardProps) {
  const Heading = headingLevel;
  return (
    <Link
      href={href}
      className={cn(
        'group flex h-full min-h-[420px] flex-col overflow-hidden rounded-md bg-white text-ink no-underline shadow-card',
        'transition-[box-shadow,transform] duration-150 hover:-translate-y-1 hover:shadow-card-hover',
        'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
      )}
    >
      <div className="relative aspect-[16/10] w-full shrink-0 bg-divider">
        <MediaImage media={cover} preset="card" />
        {badge && <div className="absolute top-3 left-3">{badge}</div>}
        {cornerBadge && <div className="absolute bottom-3 left-3">{cornerBadge}</div>}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        {chips && <div className="flex flex-wrap gap-1.5">{chips}</div>}
        <Heading
          lang={titleLang}
          className="line-clamp-2 text-[20px] leading-[1.3] font-bold group-hover:text-brand-dark"
        >
          {title}
        </Heading>
        {children}
        <span className="mt-auto flex items-center gap-1.5 pt-1 text-[15px] font-medium text-brand-dark">
          {ctaLabel}
          <ArrowRight className="size-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

/** A row with an icon in the card body (date, location, event). */
export function MediaCardMeta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-small text-muted-ink">
      <span aria-hidden className="shrink-0 text-brand [&_svg]:size-4">
        {icon}
      </span>
      {children}
    </span>
  );
}

/** Loading skeleton with the same footprint (EventsList-Loading). */
export function MediaCardSkeleton() {
  return (
    <div aria-hidden className="flex min-h-[420px] flex-col overflow-hidden rounded-md bg-white shadow-card">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-3.5 p-5">
        <div className="flex gap-1.5">
          <Skeleton className="h-[26px] w-21 rounded-full" />
          <Skeleton className="h-[26px] w-16 rounded-full" />
        </div>
        <Skeleton className="h-[18px] w-[92%]" />
        <Skeleton className="h-[18px] w-[64%]" />
        <Skeleton className="mt-1.5 h-3 w-[48%]" />
        <Skeleton className="h-3 w-[56%]" />
        <Skeleton className="mt-auto h-3.5 w-[30%]" />
      </div>
    </div>
  );
}
