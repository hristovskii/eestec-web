import { Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

import { FieldError } from './form-field';

type Option = { value: string; label: React.ReactNode };

type SegmentedChoiceProps = {
  /** Field name; also the id prefix. */
  name: string;
  legend: React.ReactNode;
  options: Option[];
  /** radio: pick one (year of study); checkbox: pick any (interests). */
  type: 'radio' | 'checkbox';
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  required?: boolean;
  help?: React.ReactNode;
  error?: string;
  /** Hint after the legend, e.g. "Pick any". */
  hint?: React.ReactNode;
};

/**
 * Chips that behave like radios or checkboxes (JoinForm `.seg`): 44 px, selected = red border,
 * pink background and a check. Real inputs underneath, grouped in a fieldset with a legend.
 */
export function SegmentedChoice({
  name,
  legend,
  options,
  type,
  value,
  defaultValue,
  onChange,
  required,
  help,
  error,
  hint,
}: SegmentedChoiceProps) {
  const errorId = error ? `${name}-error` : undefined;
  const helpId = help ? `${name}-help` : undefined;
  const selected = value ?? defaultValue ?? [];

  const toggle = (optionValue: string, checked: boolean) => {
    if (!onChange) return;
    if (type === 'radio') onChange([optionValue]);
    else onChange(checked ? [...selected, optionValue] : selected.filter((v) => v !== optionValue));
  };

  return (
    <fieldset
      id={name}
      aria-describedby={[errorId, helpId].filter(Boolean).join(' ') || undefined}
      aria-invalid={error ? true : undefined}
      className="m-0 min-w-0 border-0 p-0"
    >
      <legend className="mb-1.5 p-0 text-small font-medium text-ink">
        {legend}
        {required && (
          <span className="text-brand-dark" aria-hidden>
            {' '}
            *
          </span>
        )}
        {hint && <span className="font-normal text-muted-ink"> · {hint}</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          const isOn = selected.includes(option.value);
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                'relative flex h-11 min-w-13 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-3.5 text-[15px] font-medium',
                'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand',
                'border has-[:checked]:border-2 has-[:checked]:border-brand has-[:checked]:bg-brand-tint has-[:checked]:text-brand-dark',
                error ? 'border-brand' : 'border-line-input bg-white',
              )}
            >
              <input
                id={id}
                type={type}
                name={name}
                value={option.value}
                className="peer absolute size-px opacity-0"
                {...(value !== undefined ? { checked: isOn } : { defaultChecked: isOn })}
                onChange={(event) => toggle(option.value, event.target.checked)}
              />
              <Check className="hidden size-4 peer-checked:block" aria-hidden />
              {option.label}
            </label>
          );
        })}
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
      {help && (
        <span id={helpId} className="mt-1.5 block text-small text-muted-ink">
          {help}
        </span>
      )}
    </fieldset>
  );
}
