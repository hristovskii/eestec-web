import * as React from 'react';

import { cn } from '@/shared/lib/cn';

type InboxDetailProps = {
  /** "Elena Petrovska": the avatar shows the initials. */
  name: string;
  initials: string;
  /** Shown under the name as a mailto link. */
  email: string;
  /** "Sun 4 Oct 2026, 17:42 · Subject: Membership · sent to members@eestec.mk". */
  meta: React.ReactNode;
  /** Status select and icon buttons, top right. */
  controls?: React.ReactNode;
  /** Message text, or the fields of an inquiry or application. */
  children: React.ReactNode;
  /** Reply by e-mail and the quick status buttons. */
  actions?: React.ReactNode;
  /** The internal notes panel. */
  notes?: React.ReactNode;
  className?: string;
};

/** The right side of the Inbox (AdminInbox): who, when, controls, the text, actions and the notes. */
export function InboxDetail({
  name,
  initials,
  email,
  meta,
  controls,
  children,
  actions,
  notes,
  className,
}: InboxDetailProps) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-divider px-4 py-5 md:px-6">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-divider text-small font-bold"
          >
            {initials}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-[16px] leading-tight font-bold">{name}</h2>
            <a href={`mailto:${email}`} className="text-[13px] break-all text-brand-dark">
              {email}
            </a>
            <span className="text-[13px] text-muted-ink">{meta}</span>
          </div>
        </div>
        {controls && <div className="flex items-center gap-2">{controls}</div>}
      </div>
      <div className="flex max-w-180 flex-col gap-3.5 px-4 py-5.5 text-[15px] leading-[1.65] md:px-6">
        {children}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5 px-4 pb-5 md:px-6">{actions}</div>}
      {notes && <div className="mt-auto">{notes}</div>}
    </div>
  );
}

/** A label and its value in the detail of an inquiry or application ("Faculty · FEEIT"). */
export function InboxFacts({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="m-0 grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-[13px] text-muted-ink">{item.label}</dt>
          <dd className="m-0 text-[15px] font-medium break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
