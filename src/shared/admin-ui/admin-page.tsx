import type { Route } from 'next';
import Link from 'next/link';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

/** The content area of every admin screen (same width and padding as the dashboard). */
export function AdminPage({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'mx-auto flex max-w-[1240px] flex-col gap-5 px-4 py-6 md:px-6 xl:px-8 xl:py-7',
        className,
      )}
      {...props}
    />
  );
}

/** H1, one line of context and the page's actions (AdminEvents: Event types · Export CSV · Add event). */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-[24px] leading-tight font-bold">{title}</h1>
        {description && <p className="text-small text-muted-ink">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const badgeTones = {
  /** Published. */
  dark: 'bg-ink text-white',
  /** Draft. */
  outline: 'border border-line-input bg-white text-ink-2',
  /** Hidden. */
  muted: 'bg-divider text-muted-ink',
  neutral: 'border border-line bg-surface text-ink-2',
  /** Needs action (no alt text, 2-step off): red counts that need action are allowed (CLAUDE.md). */
  attention: 'border border-brand/35 bg-brand-tint text-brand-dark',
} as const;

export type AdminBadgeTone = keyof typeof badgeTones;

/** Small status pill with a dot (admin tables, save bar). Features map their statuses to a tone. */
export function AdminBadge({
  tone,
  dot = true,
  children,
  className,
}: {
  tone: AdminBadgeTone;
  /** Status pills have a dot (Published); value pills don't (2-step "On", "Own events"). */
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap',
        badgeTones[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

type AdminTab = { href: string; label: React.ReactNode; count?: number; current: boolean };

/** URL tabs with counts inside a panel (AdminEvents: All · Upcoming · Past). Plain links. */
export function AdminTabs({ tabs, label }: { tabs: AdminTab[]; label: string }) {
  return (
    <nav aria-label={label} className="border-b border-line px-4 md:px-5">
      <ul className="-mb-px flex gap-6 overflow-x-auto">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href as Route}
              scroll={false}
              aria-current={tab.current ? 'page' : undefined}
              className={cn(
                'flex h-11 items-center gap-2 border-b-2 text-small whitespace-nowrap no-underline',
                'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand',
                tab.current
                  ? 'border-brand font-bold text-ink'
                  : 'border-transparent font-medium text-muted-ink hover:text-ink',
              )}
            >
              {tab.label}
              {tab.count !== undefined && <CountPill>{tab.count}</CountPill>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Grey count next to a label (tabs). Counts that need action use the red sidebar pill instead. */
export function CountPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-divider px-1.5 text-[12px] font-bold text-ink-2 tabular-nums">
      {children}
    </span>
  );
}

/** The white panel that holds tabs, filters, a table and its pagination. */
export function TablePanel({ className, ...props }: React.ComponentProps<'section'>) {
  return (
    <section className={cn('overflow-hidden rounded-md border border-line bg-white', className)} {...props} />
  );
}
