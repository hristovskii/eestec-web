import * as React from 'react';

import { cn } from '@/shared/lib/cn';

/** Activity / benefit card (Main › Cards): icon tile, title, short text. */
export function IconCard({
  icon,
  title,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-md border border-line bg-white p-6', className)}>
      <span
        aria-hidden
        className="flex size-12 items-center justify-center rounded-md bg-brand-tint text-brand [&_svg]:size-6"
      >
        {icon}
      </span>
      <h3 className="text-[20px] leading-[1.3] font-bold">{title}</h3>
      {children && <p className="text-small text-muted-ink">{children}</p>}
    </div>
  );
}

/** Big red number + label (EESTEC in numbers, For Companies › Who you reach). */
export function StatTile({
  value,
  label,
  className,
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1 rounded-md border border-line p-6', className)}>
      <span className="text-[40px] leading-[1.1] font-bold text-brand lg:text-[48px]">{value}</span>
      <span className="text-body text-muted-ink">{label}</span>
    </div>
  );
}

const avatarTones = {
  /** Memory author on cards. */
  dark: 'bg-ink text-white',
  /** Former member, alumni. */
  grey: 'border border-line bg-surface text-ink-2',
  /** Header menu, member cards without photo. */
  tint: 'bg-brand-tint text-brand-dark',
  /** On the red header. */
  white: 'bg-white text-brand-dark',
  /** Admin users that aren't super admins (AdminUsers). */
  light: 'bg-divider text-ink',
} as const;

/** Initials circle when there is no photo. Decorative: the name is always shown next to it. */
export function InitialsAvatar({
  initials,
  size = 32,
  tone = 'dark',
  className,
}: {
  initials: string;
  size?: number;
  tone?: keyof typeof avatarTones;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.36)) }}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold',
        avatarTones[tone],
        className,
      )}
    >
      {initials}
    </span>
  );
}
