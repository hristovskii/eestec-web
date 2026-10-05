'use client';

import { Check, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';

type ChipOption = { id: string; label: string };

/**
 * Pick any (AdminEventEdit › Topics): toggle chips, plus an optional "New topic" chip that adds
 * an option on the spot. Selected chips have a red border and a check (`.chip.on`).
 */
export function ChipMultiSelect({
  label,
  options,
  value,
  onChange,
  onCreate,
}: {
  /** Accessible name of the group. */
  label: string;
  options: ChipOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  /** Creates an option and returns it (selected right away), or an error message. */
  onCreate?: (name: string) => Promise<ChipOption | { error: string }>;
}) {
  const t = useTranslations('admin.ui.chips');
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const inputId = React.useId();

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((other) => other !== id) : [...value, id]);

  const create = () =>
    startTransition(async () => {
      if (!onCreate || !name.trim()) return;
      const result = await onCreate(name.trim());
      if ('error' in result) {
        setError(result.error);
        return;
      }
      onChange([...value, result.id]);
      setName('');
      setError(null);
      setAdding(false);
    });

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = value.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(option.id)}
              className={cn(
                'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-medium',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                on
                  ? 'border-2 border-brand bg-brand-tint px-[11px] text-brand-dark'
                  : 'border border-line-input bg-white text-ink hover:border-ink',
              )}
            >
              {on && <Check className="size-3.5" aria-hidden />}
              {option.label}
            </button>
          );
        })}
        {onCreate && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-line-input px-3 text-[13px] font-medium text-muted-ink hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Plus className="size-3.5" aria-hidden />
            {t('new')}
          </button>
        )}
      </div>
      {adding && (
        <div className="flex flex-wrap items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col sm:max-w-[320px]">
            <label htmlFor={inputId} className="sr-only">
              {t('newLabel')}
            </label>
            <Input
              id={inputId}
              autoFocus
              value={name}
              placeholder={t('newLabel')}
              aria-invalid={error ? true : undefined}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  create();
                }
                if (event.key === 'Escape') setAdding(false);
              }}
              className="md:text-small"
            />
            {error && (
              <span role="alert" className="mt-1.5 text-small text-brand-dark">
                {error}
              </span>
            )}
          </div>
          <Button size="sm" variant="quiet" onClick={create} disabled={pending || !name.trim()}>
            {t('add')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)} disabled={pending}>
            {t('cancel')}
          </Button>
        </div>
      )}
    </div>
  );
}
