'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/cn';
import { countdownParts } from '@/shared/lib/countdown';

import { useNow } from './clock-provider';

type CountdownProps = {
  /** ISO date-time the countdown runs to. */
  target: string;
  /** Server "now" (ISO) used for the first render. */
  now: string;
  /**
   * cells: days / hours / min (Main › Countdown)
   * timer: days / hours / min / sec (ApplyBox, Home hero)
   * inline: "13 d 05 h 42 m" (sticky mobile apply bar)
   */
  variant?: 'cells' | 'timer' | 'inline';
  /** Red cells for the last 72 hours ("Closing soon"). */
  urgent?: boolean;
  /** Dark numbers: counting down to an opening, not a deadline ("Opening soon"). */
  neutral?: boolean;
  /**
   * Text before the countdown for screen readers, e.g. "Applications close in". Leave it out for
   * the inline variant when the label is already visible next to it.
   */
  label?: string;
  className?: string;
};

const pad = (n: number) => String(n).padStart(2, '0');

export function Countdown({
  target,
  now: initialNow,
  variant = 'cells',
  urgent,
  neutral,
  label,
  className,
}: CountdownProps) {
  const t = useTranslations('ui.countdown');
  const now = useNow(new Date(initialNow), variant === 'timer' ? 1000 : 30_000);
  const parts = countdownParts(new Date(target), now);

  if (variant === 'inline') {
    return (
      <span className={className}>
        {label && <span className="sr-only">{label} </span>}
        {t('inline', { days: parts.days, hours: pad(parts.hours), minutes: pad(parts.minutes) })}
      </span>
    );
  }

  const cells = [
    { value: parts.days, unit: t('days', { count: parts.days }) },
    { value: parts.hours, unit: t('hours', { count: parts.hours }) },
    { value: parts.minutes, unit: t('minutes') },
    ...(variant === 'timer' ? [{ value: parts.seconds, unit: t('seconds') }] : []),
  ];

  return (
    <div
      role="timer"
      aria-label={label}
      className={cn('flex gap-2', variant === 'timer' && 'grid grid-cols-4', className)}
    >
      {cells.map((cell) => (
        <div
          key={cell.unit}
          className={cn(
            'flex flex-col items-center rounded-sm py-2.5',
            variant === 'cells' && 'w-18',
            urgent ? 'bg-brand text-white' : 'bg-surface',
          )}
        >
          <span
            className={cn(
              'text-[28px] leading-[1.1] font-bold tabular-nums',
              urgent ? 'text-white' : neutral ? 'text-ink' : 'text-brand',
            )}
          >
            {variant === 'cells' ? cell.value : pad(cell.value)}
          </span>
          <span className={cn('text-small', urgent ? 'font-medium text-white' : 'text-muted-ink')}>
            {cell.unit}
          </span>
        </div>
      ))}
    </div>
  );
}
