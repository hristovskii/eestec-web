import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';

const chipTones = {
  /** Type chips: Workshop, Exchange… */
  neutral: 'bg-surface text-ink',
  /** Scope chips: Local, International. */
  outline: 'border border-line-strong bg-white text-ink',
  red: 'bg-brand-tint text-brand-dark',
  dark: 'bg-ink text-white',
} as const;

type ChipProps = React.ComponentProps<'span'> & {
  tone?: keyof typeof chipTones;
  size?: 'sm' | 'md';
};

/** Static label chip (Main › Badges & chips): 28 px, or 26 px inside cards. */
export function Chip({ tone = 'neutral', size = 'md', className, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
        size === 'md' ? 'h-7 px-3 text-small' : 'h-[26px] px-2.5 text-[13px]',
        chipTones[tone],
        className,
      )}
      {...props}
    />
  );
}

const statusTones = {
  /** Applications open / Closing soon: red with a white dot. */
  open: 'bg-brand text-white',
  /** Opening soon: white with a dark outline. */
  soon: 'border-[1.5px] border-ink bg-white text-ink',
  /** Applications closed. */
  closed: 'bg-surface text-muted-ink',
  /** Full · waitlist open, Just ended. */
  dark: 'bg-ink text-white',
} as const;

export type StatusTone = keyof typeof statusTones;

type StatusBadgeProps = {
  tone: StatusTone;
  children: React.ReactNode;
  /** On top of an image: white background behind light tones and a soft shadow. */
  overlay?: boolean;
  className?: string;
};

/** Status pill. Features map their own states to a tone and a translated label. */
export function StatusBadge({ tone, children, overlay, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-small font-medium whitespace-nowrap',
        statusTones[tone],
        overlay && 'shadow-badge',
        overlay && tone === 'closed' && 'bg-white',
        className,
      )}
    >
      {tone === 'open' && <span aria-hidden className="size-1.5 rounded-full bg-white" />}
      {children}
    </span>
  );
}

type RemovableTagProps = {
  children: string;
  /** URL without this filter: removing works without JavaScript. */
  removeHref: string;
};

/** Active filter tag with a remove link (EventsList-Empty). */
export function RemovableTag({ children, removeHref }: RemovableTagProps) {
  const t = useTranslations('ui');
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface pr-1.5 pl-3 text-small font-medium whitespace-nowrap text-ink">
      {children}
      <Link
        href={removeHref}
        scroll={false}
        aria-label={t('removeFilter', { filter: children })}
        className="flex size-6 items-center justify-center rounded-full text-ink hover:bg-line focus-visible:outline-2 focus-visible:outline-brand"
      >
        <X className="size-3.5" aria-hidden />
      </Link>
    </span>
  );
}

type FilterChipProps = {
  href: string;
  pressed: boolean;
  children: React.ReactNode;
  count?: number;
};

const filterChipClasses = (pressed: boolean) =>
  cn(
    'inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-small font-medium whitespace-nowrap no-underline',
    'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand',
    pressed ? 'border-brand bg-brand text-white' : 'border-line-strong bg-white text-ink hover:border-ink',
  );

/** Filter chip as a link (type chips on list pages): 40 px, red when selected. */
export function FilterChip({ href, pressed, children, count }: FilterChipProps) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={pressed ? 'true' : undefined}
      className={filterChipClasses(pressed)}
    >
      {children}
      {count !== undefined && <span className="text-[13px] font-normal opacity-80">{count}</span>}
    </Link>
  );
}

/** The same chip as a toggle button, for filters that change the page without a new address (the committee map). */
export function FilterToggle({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={filterChipClasses(pressed)}>
      {children}
    </button>
  );
}
