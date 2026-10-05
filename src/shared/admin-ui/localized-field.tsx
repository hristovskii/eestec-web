'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import type { Locale } from '@/shared/i18n/routing';
import { cn } from '@/shared/lib/cn';
import type { Localized } from '@/shared/types/localized';
import { FieldError } from '@/shared/ui/form/form-field';
import { Input } from '@/shared/ui/primitives/input';
import { Textarea } from '@/shared/ui/primitives/textarea';

type LocalizedFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  help?: React.ReactNode;
  value: Localized;
  onChange: (value: Localized) => void;
  /** Error of the Macedonian text (the required one). Showing it switches to MK. */
  error?: string;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
};

/**
 * One board-editable text in both languages (D8): MK is required, EN optional; an empty EN shows
 * the Macedonian text on the English page. One control at a time, switched with MK · EN.
 */
export function LocalizedField({
  id,
  label,
  required,
  help,
  value,
  onChange,
  error,
  multiline,
  rows = 4,
  placeholder,
}: LocalizedFieldProps) {
  const t = useTranslations('admin.ui.localized');
  const [lang, setLang] = React.useState<Locale>('mk');
  // A new error is about the Macedonian text: show it (the error summary links to this field).
  const [lastError, setLastError] = React.useState(error);
  if (error !== lastError) {
    setLastError(error);
    if (error) setLang('mk');
  }

  const text = lang === 'mk' ? value.mk : (value.en ?? '');
  const englishEmpty = !value.en?.trim();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const showError = error && lang === 'mk';
  const helpText = lang === 'en' && englishEmpty ? t('fallback') : help;

  const control = {
    id,
    lang,
    value: text,
    placeholder,
    required: lang === 'mk' ? required : undefined,
    'aria-invalid': showError ? (true as const) : undefined,
    'aria-describedby': [showError && errorId, helpText && helpId].filter(Boolean).join(' ') || undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(lang === 'mk' ? { ...value, mk: event.target.value } : { ...value, en: event.target.value }),
  };

  return (
    <div className="flex flex-col">
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-small font-medium text-ink">
          {label}
          {required && lang === 'mk' && (
            <span className="text-brand-dark" aria-hidden>
              {' '}
              *
            </span>
          )}
          <span className="sr-only"> ({lang === 'mk' ? t('mkName') : t('enName')})</span>
        </label>
        <div
          role="group"
          aria-label={t('languages', { label })}
          className="inline-flex shrink-0 rounded-sm border border-line bg-white p-0.5"
        >
          {(['mk', 'en'] as const).map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={lang === code}
              aria-label={code === 'mk' ? t('mkName') : t('enName')}
              onClick={() => setLang(code)}
              className={cn(
                'relative flex h-6 cursor-pointer items-center gap-1 rounded-sm px-2 text-[12px] font-bold',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
                lang === code ? 'bg-ink text-white' : 'text-ink-2 hover:bg-surface',
              )}
            >
              {code === 'mk' ? t('mk') : t('en')}
              {code === 'mk' && error && <span aria-hidden className="size-1.5 rounded-full bg-brand" />}
              {code === 'en' && englishEmpty && (
                <span
                  aria-hidden
                  title={t('enEmpty')}
                  className={cn(
                    'size-1.5 rounded-full border',
                    lang === 'en' ? 'border-white' : 'border-muted-ink',
                  )}
                />
              )}
            </button>
          ))}
        </div>
      </div>
      {multiline ? (
        <Textarea {...control} rows={rows} className="min-h-0 md:text-small" />
      ) : (
        <Input {...control} className="md:text-small" />
      )}
      {showError && <FieldError id={errorId}>{error}</FieldError>}
      {helpText && (
        <span id={helpId} className="mt-1.5 text-small text-muted-ink">
          {helpText}
        </span>
      )}
    </div>
  );
}
