'use client';

import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';
import { Countdown } from '@/shared/ui/countdown';
import { Button } from '@/shared/ui/primitives/button';

type StickyApplyBarProps = {
  /** apply / waitlist: jump to the form; external: the eestec.net link. */
  mode: 'apply' | 'waitlist' | 'external';
  href: string;
  /** Deadline the bar counts down to; null: no countdown (waitlist, late applications). */
  closesAt: string | null;
  now: string;
  /** Text above the countdown, or instead of it. */
  label: string;
  buttonLabel: string;
  /** Hide the bar while this element (the form) is on screen. */
  hideWhenVisible: string;
  /** Name of the bar as a region ("Apply for this event"). */
  name: string;
};

/**
 * Phones: the deadline and "Apply now" stay at the bottom of the screen while reading the page
 * (UpcomingDetail-Mobile-Viewport). Sticky at the end of the page, so it never covers the footer.
 */
export function StickyApplyBar({
  mode,
  href,
  closesAt,
  now,
  label,
  buttonLabel,
  hideWhenVisible,
  name,
}: StickyApplyBarProps) {
  const t = useTranslations('applications.box');
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    const target = document.getElementById(hideWhenVisible);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setHidden(!!entry?.isIntersecting), {
      rootMargin: '0px 0px -30% 0px',
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hideWhenVisible]);

  return (
    <div
      className={cn(
        'sticky bottom-0 z-15 flex items-center gap-3 border-t border-line bg-white px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgb(0_0_0/0.08)] lg:hidden',
        'transition-transform duration-200 motion-reduce:transition-none',
        hidden && 'pointer-events-none translate-y-full',
      )}
      role="region"
      aria-label={name}
      aria-hidden={hidden || undefined}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[13px] text-muted-ink">{label}</span>
        {closesAt && (
          <Countdown
            target={closesAt}
            now={now}
            variant="inline"
            className="text-[17px] font-bold text-brand-dark tabular-nums"
          />
        )}
      </div>
      <Button
        asChild
        variant={mode === 'waitlist' ? 'secondary' : 'primary'}
        tabIndex={hidden ? -1 : undefined}
      >
        {mode === 'external' ? (
          <a href={href} target="_blank" rel="noopener noreferrer" tabIndex={hidden ? -1 : undefined}>
            {buttonLabel}
            <ArrowUpRight aria-hidden />
            <span className="sr-only">{t('newTab')}</span>
          </a>
        ) : (
          <a href={href} tabIndex={hidden ? -1 : undefined}>
            {buttonLabel}
          </a>
        )}
      </Button>
    </div>
  );
}
