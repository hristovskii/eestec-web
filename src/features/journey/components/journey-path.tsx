'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

import type { PublicJourney } from '../types';
import { JourneyIconView } from './journey-icon';
import { JourneyStepCard } from './journey-step-card';

const QUERY_WIDE = '(min-width: 1024px)';
const QUERY_CALM = '(prefers-reduced-motion: reduce)';

/** A media query that follows the window (false on the server). */
function useMedia(query: string) {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    const list = window.matchMedia(query);
    const sync = () => setMatches(list.matches);
    sync();
    list.addEventListener('change', sync);
    return () => list.removeEventListener('change', sync);
  }, [query]);
  return matches;
}

const GREY = 'var(--color-line-strong)';
const DRAW = 3000;

/**
 * The path of /journey (Journey, Journey-Mobile, JourneyStates): a node and a card per step, joined
 * by a line that is grey and dashed until the visitor has scrolled to it and then red and solid.
 * Cards slide up as they enter; the step in the middle of the screen gets a soft halo. With
 * reduced motion everything is shown at once. Desktop: cards alternate left and right and several
 * can stay open; phones: a vertical line on the left and one open step at a time.
 */
export function JourneyPath({ steps }: { steps: PublicJourney['steps'] }) {
  const t = useTranslations('journey.path');
  const wide = useMedia(QUERY_WIDE);
  const calm = useMedia(QUERY_CALM);
  const [enhanced, setEnhanced] = React.useState(false);
  const [open, setOpen] = React.useState<string[]>([]);
  // The step in the middle of the screen (-1: none yet) and how far the visitor has seen.
  const [current, setCurrent] = React.useState(-1);
  const [entered, setEntered] = React.useState(-1);
  const list = React.useRef<HTMLOListElement>(null);

  React.useEffect(() => {
    let frame = 0;
    const measure = () => {
      const items = list.current?.children;
      if (!items) return;
      const height = window.innerHeight;
      let middle = -1;
      let seen = -1;
      for (let index = 0; index < items.length; index++) {
        const top = items[index]!.getBoundingClientRect().top;
        if (top <= height * 0.55) middle = index;
        if (top <= height * 0.9) seen = index;
      }
      setCurrent(middle);
      setEntered((before) => Math.max(before, seen));
      setEnhanced(true);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [steps.length]);

  const toggle = (id: string) =>
    setOpen((before) =>
      before.includes(id) ? before.filter((other) => other !== id) : wide ? [...before, id] : [id],
    );
  // Phones keep one step open: shrinking the window closes the others.
  const shown = wide ? open : open.slice(-1);

  return (
    <section
      aria-label={t('label')}
      className="mx-auto w-full max-w-[calc(1200px+48px)] px-4 pt-12 sm:px-6 lg:pt-22"
    >
      <ol ref={list} className="m-0 list-none p-0">
        {steps.map((step, index) => {
          const left = index % 2 === 0;
          const reached = index <= current;
          const lineReached = index < current;
          const last = index === steps.length - 1;
          const isOpen = shown.includes(step.id);
          const hidden = enhanced && !calm && index > entered;
          const nodeX = left ? 10 : 90;
          const nextX = left ? 90 : 10;
          return (
            <li
              key={step.id}
              id={`step-${step.n}`}
              className="group/step relative scroll-mt-24 pb-7 pl-18 lg:flex lg:min-h-[380px] lg:scroll-mt-28 lg:pb-[140px] lg:pl-0"
            >
              {/* Phone: the line down the left, drawn in red once reached. */}
              <span aria-hidden className="absolute top-14.5 bottom-0 left-[26px] w-1 lg:hidden">
                <span className="absolute inset-0 border-l-4 border-dashed" style={{ borderColor: GREY }} />
                <span
                  className={cn(
                    'absolute inset-0 origin-top bg-brand',
                    !calm && 'transition-transform duration-500',
                    lineReached ? 'scale-y-100' : 'scale-y-0',
                  )}
                />
              </span>
              {/* Desktop: the big faded number, the line below the node and the curve to the next node. */}
              <span
                aria-hidden
                data-number={String(step.n).padStart(2, '0')}
                // Drawn as generated content: purely decorative, so it is not text for contrast checks.
                className={cn(
                  'absolute top-[40%] hidden -translate-y-1/2 text-[200px] leading-none font-bold text-brand/7 before:content-[attr(data-number)] lg:block',
                  left ? 'right-[2%]' : 'left-[2%]',
                )}
              />
              <span
                aria-hidden
                className="absolute top-19 bottom-[140px] hidden w-1 -translate-x-1/2 lg:block"
                style={{ left: `${nodeX}%` }}
              >
                <span className="absolute inset-0 border-l-4 border-dashed" style={{ borderColor: GREY }} />
                <span
                  className={cn(
                    'absolute inset-0 origin-top bg-brand',
                    !calm && 'transition-transform duration-500',
                    lineReached ? 'scale-y-100' : 'scale-y-0',
                  )}
                />
              </span>
              <svg
                aria-hidden
                viewBox="0 0 100 140"
                preserveAspectRatio="none"
                className="absolute right-0 bottom-0 left-0 hidden h-[140px] w-full lg:block"
              >
                <path
                  d={`M${nodeX} 0 C${nodeX} 90 ${last ? 50 : nextX} 50 ${last ? 50 : nextX} 140`}
                  fill="none"
                  stroke={GREY}
                  strokeWidth="4"
                  strokeDasharray="10 10"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={`M${nodeX} 0 C${nodeX} 90 ${last ? 50 : nextX} 50 ${last ? 50 : nextX} 140`}
                  fill="none"
                  stroke="var(--color-brand)"
                  strokeWidth="4"
                  vectorEffect="non-scaling-stroke"
                  // Non-scaling strokes count in pixels, so the dash is longer than any curve.
                  strokeDasharray={DRAW}
                  strokeDashoffset={lineReached ? 0 : DRAW}
                  style={calm ? undefined : { transition: 'stroke-dashoffset 0.6s ease-out' }}
                />
              </svg>

              {index === current && (
                <span
                  aria-hidden
                  className="absolute -top-2 -left-2 z-[1] size-[74px] rounded-full bg-brand/16 lg:-top-3.5 lg:-ml-0 lg:size-26 lg:-translate-x-1/2"
                  style={wide ? { left: `${nodeX}%` } : undefined}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  'absolute top-0 left-0 z-[2] flex size-[58px] items-center justify-center rounded-full border-[3px] border-brand shadow-[0_6px_16px_rgb(229_42_48/0.22)] transition-[transform,background-color,color] duration-200 lg:size-19 lg:-translate-x-1/2',
                  'group-has-[[data-card]:hover]/step:scale-110',
                  reached ? 'bg-brand text-white' : 'bg-white text-brand',
                )}
                style={wide ? { left: `${nodeX}%` } : undefined}
              >
                <JourneyIconView icon={step.icon} className="size-6 lg:size-7" />
              </span>

              <div
                className={cn(
                  'relative z-[2] w-full max-w-full lg:transition-[width] lg:duration-300',
                  isOpen ? 'lg:w-[660px]' : 'lg:w-[500px]',
                  left ? 'lg:ml-[calc(10%+64px)]' : 'lg:mr-[calc(10%+64px)] lg:ml-auto',
                  !calm && 'transition-[opacity,transform] duration-[400ms]',
                  hidden ? 'translate-y-8 opacity-0' : 'translate-y-0 opacity-100',
                )}
              >
                <JourneyStepCard step={step} open={isOpen} onToggle={() => toggle(step.id)} />
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-col items-center gap-3 pb-14 lg:pb-18">
        <span
          aria-hidden
          className="flex size-22 items-center justify-center rounded-full border-[3px] border-dashed border-line-strong bg-white text-muted-ink"
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <span className="text-[18px] font-bold">{t('yourTurn')}</span>
      </div>
    </section>
  );
}
