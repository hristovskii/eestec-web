'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';
import { Section } from '@/shared/ui/container';
import { MediaImage } from '@/shared/ui/media-image';
import { SectionTitle } from '@/shared/ui/section-title';

import type { PublicHome } from '../types';

const arrow =
  'flex size-11 cursor-pointer items-center justify-center rounded-full border bg-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand disabled:cursor-default disabled:border-line-strong disabled:text-muted-ink';

/**
 * "Tradition of LC Skopje" (Home › Timeline): a row of milestones that scrolls sideways on a
 * computer (with ← → buttons that appear when it does not fit), and a vertical list on a phone.
 */
export function TraditionSection({ milestones }: { milestones: PublicHome['tradition'] }) {
  const t = useTranslations('home.tradition');
  const track = React.useRef<HTMLDivElement>(null);
  const [edge, setEdge] = React.useState({ overflow: false, start: true, end: true });

  React.useEffect(() => {
    const element = track.current;
    if (!element) return;
    const measure = () =>
      setEdge({
        overflow: element.scrollWidth > element.clientWidth + 1,
        start: element.scrollLeft <= 1,
        end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 1,
      });
    measure();
    element.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      element.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [milestones.length]);

  const move = (direction: 1 | -1) => {
    const element = track.current;
    if (!element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
  };

  const since = Math.min(...milestones.map((milestone) => milestone.year));

  return (
    <Section tone="grey" aria-labelledby="home-tradition">
      <div className="flex flex-col gap-8 lg:gap-12">
        <div className="flex items-end justify-between gap-6">
          <SectionTitle id="home-tradition" eyebrow={t('eyebrow', { year: since })} title={t('title')} />
          {edge.overflow && (
            <div className="flex gap-2 max-lg:hidden">
              <button
                type="button"
                aria-label={t('previous')}
                disabled={edge.start}
                onClick={() => move(-1)}
                className={cn(arrow, 'border-ink text-ink')}
              >
                <ArrowLeft className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={t('next')}
                disabled={edge.end}
                onClick={() => move(1)}
                className={cn(arrow, 'border-ink text-ink')}
              >
                <ArrowRight className="size-5" aria-hidden />
              </button>
            </div>
          )}
        </div>
        <div
          ref={track}
          // Scrolls with the keyboard once it overflows (arrow keys), like any scroll area.
          tabIndex={edge.overflow ? 0 : undefined}
          role={edge.overflow ? 'region' : undefined}
          aria-label={edge.overflow ? t('region') : undefined}
          className="relative lg:overflow-x-auto lg:pb-2 lg:focus-visible:outline-3 lg:focus-visible:outline-brand"
        >
          {/* The red line: down the left on a phone, across the dots on a computer. */}
          <span
            aria-hidden
            className="absolute top-2.5 bottom-2.5 left-[9px] w-0.5 bg-brand lg:top-[9px] lg:right-0 lg:bottom-auto lg:left-0 lg:h-0.5 lg:w-auto"
          />
          <ol className="relative m-0 flex list-none flex-col gap-8 p-0 lg:grid lg:auto-cols-[minmax(210px,1fr)] lg:grid-flow-col lg:gap-6">
            {milestones.map((milestone) => (
              <li
                key={milestone.id}
                className="grid grid-cols-[20px_minmax(0,1fr)] gap-4 lg:flex lg:flex-col lg:gap-3"
              >
                <span
                  aria-hidden
                  className="mt-1 size-5 rounded-full border-4 border-surface bg-brand shadow-[0_0_0_2px_var(--color-brand)] lg:mt-0"
                />
                <div className="flex flex-col gap-1.5 lg:gap-3">
                  <span className="text-[24px] leading-[1.2] font-bold text-brand lg:pt-1.5 lg:text-[28px] lg:leading-[1.1]">
                    {milestone.year}
                  </span>
                  <h3 className="text-[18px] leading-[1.35] font-bold">{milestone.title}</h3>
                  <p className="text-small text-muted-ink">{milestone.text}</p>
                  {milestone.photo && (
                    <div className="relative mt-1 aspect-[4/3] overflow-hidden rounded-[10px]">
                      <MediaImage media={milestone.photo} preset="card" />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}
