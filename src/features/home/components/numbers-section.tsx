'use client';

import { useFormatter, useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';
import { Section } from '@/shared/ui/container';
import { SectionTitle } from '@/shared/ui/section-title';

import type { PublicHome } from '../types';

const DURATION_MS = 1400;

/**
 * Counts from 0 to `value` once the number is on screen. Without JavaScript, with reduced motion,
 * and for screen readers the final number is there from the start (the animated text is hidden
 * from them and the final one is read).
 */
function CountUp({ value, suffix }: { value: number; suffix: string }) {
  const format = useFormatter();
  const ref = React.useRef<HTMLElement>(null);
  const [shown, setShown] = React.useState(value);

  React.useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (time: number) => {
          const progress = Math.min(1, (time - start) / DURATION_MS);
          // Ease out, so the last numbers slow down.
          setShown(Math.round(value * (1 - (1 - progress) ** 3)));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        setShown(0);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref}>
      {/* Browsers' number data can differ from the server's (the grouping of 5000), which is not a mismatch worth a re-render. */}
      <span className="sr-only" suppressHydrationWarning>
        {format.number(value)}
        {suffix}
      </span>
      <span aria-hidden suppressHydrationWarning>
        {format.number(shown)}
        {suffix}
      </span>
    </span>
  );
}

/** "EESTEC in numbers" (Home › Statistics): a row of big red numbers; two columns on a phone. */
export function NumbersSection({ stats }: { stats: PublicHome['stats'] }) {
  const t = useTranslations('home.numbers');
  // An odd last number takes the full row on a phone, as designed.
  const lastIsOdd = stats.length % 2 === 1;
  return (
    <Section aria-labelledby="home-numbers" className="pb-12 lg:pb-20">
      <div className="flex flex-col gap-7 lg:gap-12">
        <SectionTitle id="home-numbers" title={t('title')} className="lg:items-center lg:text-center" />
        <dl
          className="m-0 grid grid-cols-2 gap-3 lg:grid-cols-[repeat(var(--stats),minmax(0,1fr))] lg:gap-0 lg:border-y lg:border-line"
          style={{ '--stats': stats.length } as React.CSSProperties}
        >
          {stats.map((stat, index) => (
            <div
              key={stat.id}
              className={cn(
                'flex flex-col-reverse gap-1 rounded-md bg-surface px-4 py-5 lg:items-center lg:gap-1.5 lg:rounded-none lg:bg-transparent lg:px-4 lg:py-8 lg:text-center',
                index > 0 && 'lg:border-l lg:border-line',
                lastIsOdd && index === stats.length - 1 && 'col-span-2 lg:col-span-1',
              )}
            >
              <dt className="text-small text-muted-ink lg:text-body">{stat.label}</dt>
              <dd className="m-0 text-[40px] leading-none font-bold text-brand lg:text-[56px]">
                <CountUp value={stat.value} suffix={stat.suffix} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
