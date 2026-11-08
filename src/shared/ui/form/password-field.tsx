'use client';

import { Check, Eye, EyeOff, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

import { Input } from '../primitives/input';

/**
 * A password input with a "show password" eye (AuthForm): the eye is a toggle button
 * (`aria-pressed`), 44 px, inside the field. Use it as the control of a `FormField`.
 */
export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<typeof Input>, 'type'>) {
  const t = useTranslations('ui.form.password');
  const [shown, setShown] = React.useState(false);
  return (
    <div className="relative">
      <Input {...props} type={shown ? 'text' : 'password'} className={cn('pr-13', className)} />
      <button
        type="button"
        aria-pressed={shown}
        aria-label={shown ? t('hide') : t('show')}
        onClick={() => setShown((value) => !value)}
        className="absolute top-1 right-1 flex h-10 w-11 cursor-pointer items-center justify-center rounded-xs text-ink-2 hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
      >
        {shown ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
      </button>
    </div>
  );
}

/** Four bars (decoration) and the word that says the same ("Strength: Good"). */
export function PasswordMeter({
  level,
  label,
}: {
  /** 0 nothing typed, 1–4 weak to strong. */
  level: 0 | 1 | 2 | 3 | 4;
  /** The text under the bars; null while nothing is typed. */
  label: React.ReactNode | null;
}) {
  return (
    <div>
      <div aria-hidden className="mt-2 grid grid-cols-4 gap-1">
        {[1, 2, 3, 4].map((bar) => (
          <span key={bar} className={cn('h-1 rounded-full', bar <= level ? 'bg-ink' : 'bg-line')} />
        ))}
      </div>
      {label && (
        <p className="mt-1.5 text-small" aria-live="polite">
          {label}
        </p>
      )}
    </div>
  );
}

export type PasswordRule = { id: string; label: string; ok: boolean };

/**
 * The rules under a new password, ticked as they are met (a tick or a cross, never colour alone).
 * Give it the id the input names in `aria-describedby`.
 */
export function PasswordRules({ id, rules }: { id: string; rules: PasswordRule[] }) {
  return (
    <ul id={id} className="m-0 mt-2 flex list-none flex-wrap gap-x-3.5 gap-y-1 p-0 text-[13px]">
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={cn('flex items-center gap-1.5', rule.ok ? 'text-ink' : 'text-muted-ink')}
        >
          {rule.ok ? (
            <Check className="size-3.5" strokeWidth={2.6} aria-hidden />
          ) : (
            <X className="size-3.5" strokeWidth={2.6} aria-hidden />
          )}
          {rule.label}
          <span className="sr-only">{rule.ok ? ' ✓' : ' ✗'}</span>
        </li>
      ))}
    </ul>
  );
}
