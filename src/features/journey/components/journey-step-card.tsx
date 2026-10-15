'use client';

import { ArrowRight, ChevronDown, ChevronUp, Quote } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ActionLink } from '@/shared/ui/action-link';
import { cn } from '@/shared/lib/cn';
import { MediaImage } from '@/shared/ui/media-image';

import type { PublicJourney } from '../types';

type Step = PublicJourney['steps'][number];

/**
 * One step (JourneyStep): "STEP 03", title, text and a button; "Show more" opens the benefits, a
 * photo and a quote. Hovering only highlights; opening is by click or tap and stays until closed.
 */
export function JourneyStepCard({
  step,
  open,
  onToggle,
  className,
}: {
  step: Step;
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const t = useTranslations('journey.step');
  const panelId = `step-${step.n}-more`;
  const expandable = step.bullets.length > 0 || !!step.photo || !!step.quote;
  const number = String(step.n).padStart(2, '0');

  return (
    <article
      data-card
      aria-labelledby={`step-${step.n}-title`}
      className={cn(
        'group/card flex w-full flex-col gap-3.5 rounded-2xl border bg-white p-5 transition-[box-shadow,border-color,transform] duration-200 lg:p-7',
        open || false
          ? 'border-2 border-brand shadow-[0_16px_40px_rgb(0_0_0/0.12)]'
          : 'border-line shadow-[0_1px_2px_rgb(0_0_0/0.05),0_6px_20px_rgb(0_0_0/0.06)] hover:-translate-y-1 hover:border-2 hover:border-brand hover:shadow-[0_16px_40px_rgb(0_0_0/0.12)]',
        className,
      )}
    >
      <span className="text-[13px] font-bold tracking-[0.08em] text-brand-dark">
        {t('label', { number })}
      </span>
      <h2 id={`step-${step.n}-title`} className="text-[20px] leading-[1.25] font-bold lg:text-[24px]">
        {step.title}
      </h2>
      <p className="text-body text-muted-ink lg:text-[17px] lg:leading-[1.55]">{step.text}</p>

      {expandable && (
        <div
          id={panelId}
          hidden={!open}
          className="mt-1 flex flex-col gap-3.5 border-t border-divider pt-1.5"
        >
          {(step.bullets.length > 0 || step.photo) && (
            <div
              className={cn(
                'grid items-start gap-5',
                step.photo && step.bullets.length > 0 && 'lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]',
              )}
            >
              {step.bullets.length > 0 && (
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0 pt-3.5">
                  {step.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="grid grid-cols-[22px_minmax(0,1fr)] gap-2.5 text-[15px] leading-[1.5]"
                    >
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--color-brand)"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="m8 12 3 3 5-6" />
                      </svg>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
              {step.photo && (
                <div className="relative mt-3.5 aspect-[4/3] overflow-hidden rounded-xl">
                  <MediaImage media={step.photo} preset="card" />
                </div>
              )}
            </div>
          )}
          {step.quote && (
            <figure className="m-0 mt-1 grid grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-xl bg-surface px-5 py-4.5">
              <Quote className="size-6 text-brand" aria-hidden />
              <div className="flex flex-col gap-1.5">
                <blockquote className="m-0 text-[17px] leading-[1.45] font-medium">
                  {step.quote.text}
                </blockquote>
                <figcaption className="text-small text-muted-ink">{step.quote.author}</figcaption>
              </div>
            </figure>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1">
        {step.button ? (
          <ActionLink
            href={step.button.href}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-md border-2 border-brand px-4.5 text-[15px] font-medium no-underline transition-colors',
              'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand',
              open
                ? 'bg-brand text-white hover:border-brand-dark hover:bg-brand-dark hover:text-white'
                : 'bg-white text-brand-dark hover:border-brand-dark hover:bg-brand-tint hover:text-brand-dark',
            )}
          >
            {step.button.label}
            <ArrowRight className="size-4" aria-hidden />
          </ActionLink>
        ) : (
          <span />
        )}
        {expandable && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={onToggle}
            className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-sm px-1.5 text-[15px] font-medium text-ink hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {open ? t('less') : t('more')}
            <span className="sr-only"> — {step.title}</span>
            {open ? (
              <ChevronUp className="size-4" aria-hidden />
            ) : (
              <ChevronDown className="size-4" aria-hidden />
            )}
          </button>
        )}
      </div>
    </article>
  );
}
