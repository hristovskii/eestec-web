import { CircleAlert, Info } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

const tones = {
  info: 'bg-surface text-ink',
  urgent: 'border-2 border-brand bg-brand-tint text-ink',
  dark: 'bg-ink text-white',
} as const;

type NoticeProps = {
  tone?: keyof typeof tones;
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode | false;
  actions?: React.ReactNode;
  /** role="alert" for errors that appear after an action; role="status" for confirmations. */
  role?: 'alert' | 'status';
  className?: string;
};

/** Banners: event ended, not approved, preview bar, pending account, subject routing notes. */
export function Notice({ tone = 'info', title, children, icon, actions, role, className }: NoticeProps) {
  const defaultIcon =
    tone === 'urgent' ? <CircleAlert className="size-[22px] text-brand" /> : <Info className="size-[22px]" />;
  return (
    <div role={role} className={cn('flex gap-3 rounded-md px-[18px] py-4', tones[tone], className)}>
      {icon !== false && (
        <span aria-hidden className="mt-0.5 shrink-0">
          {icon ?? defaultIcon}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {title && <strong className="text-body font-bold">{title}</strong>}
        {children && <div className="text-small">{children}</div>}
        {actions && <div className="mt-1.5 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </div>
  );
}
