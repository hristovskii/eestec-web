import type { Route } from 'next';
import Link from 'next/link';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

type StatCardProps = {
  href: string;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  icon: React.ReactNode;
  /** Red dot: something waits for a decision (counts that need action are red, CLAUDE.md). */
  attention?: boolean;
  attentionLabel?: string;
};

/** Dashboard counter (AdminDashboard): label, big number, one line of context; the card is a link. */
export function StatCard({ href, label, value, detail, icon, attention, attentionLabel }: StatCardProps) {
  return (
    <Link
      href={href as Route}
      className={cn(
        'flex flex-col gap-1 rounded-md border border-line bg-white p-3.5 text-ink no-underline transition-colors sm:gap-1.5 sm:p-5',
        'hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
      )}
    >
      <span className="flex items-start gap-2 text-[13px] leading-snug text-ink-2 sm:items-center sm:text-small">
        {attention && (
          <span role="img" aria-label={attentionLabel} className="size-2 shrink-0 rounded-full bg-brand" />
        )}
        <span className="flex-1">{label}</span>
        <span aria-hidden className="text-muted-ink [&_svg]:size-5">
          {icon}
        </span>
      </span>
      <span className="text-[26px] leading-tight font-bold sm:text-[32px]">{value}</span>
      {detail && <span className="text-[13px] text-muted-ink sm:text-small">{detail}</span>}
    </Link>
  );
}

/** White panel with a header row (Pending approvals, Recent activity…). */
export function AdminPanel({
  title,
  action,
  children,
  className,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('overflow-hidden rounded-md border border-line bg-white', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="text-[17px] font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
