'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

type StarRatingProps = {
  name: string;
  legend: React.ReactNode;
  value?: number | null;
  defaultValue?: number | null;
  onChange?: (value: number) => void;
  optional?: boolean;
};

/** 1–5 stars (SubmitForm): 48 px targets, red filled stars. A radio group underneath. */
export function StarRating({
  name,
  legend,
  value,
  defaultValue = null,
  onChange,
  optional,
}: StarRatingProps) {
  const t = useTranslations('ui.rating');
  const tForm = useTranslations('ui.form');
  const [internal, setInternal] = React.useState<number | null>(defaultValue);
  const current = value === undefined ? internal : value;
  const labels = [t('1'), t('2'), t('3'), t('4'), t('5')];

  const select = (stars: number) => {
    setInternal(stars);
    onChange?.(stars);
  };

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1.5 p-0 text-small font-medium text-ink">
        {legend}
        {optional && <span className="font-normal text-muted-ink"> · {tForm('optional')}</span>}
      </legend>
      <div className="flex items-center gap-3">
        <div className="flex">
          {labels.map((label, index) => {
            const stars = index + 1;
            const filled = current !== null && stars <= current;
            return (
              <label
                key={stars}
                className="flex size-12 cursor-pointer items-center justify-center rounded-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand"
              >
                <input
                  type="radio"
                  name={name}
                  value={stars}
                  checked={current === stars}
                  onChange={() => select(stars)}
                  className="sr-only"
                  aria-label={t('starLabel', { stars, label })}
                />
                <Star
                  aria-hidden
                  className={cn(
                    'size-8',
                    filled ? 'fill-brand text-brand' : 'fill-line-strong text-line-strong',
                  )}
                />
              </label>
            );
          })}
        </div>
        <span className="text-small text-muted-ink" aria-live="polite">
          {current ? t('selected', { stars: current, label: labels[current - 1] ?? '' }) : t('notRated')}
        </span>
      </div>
    </fieldset>
  );
}
