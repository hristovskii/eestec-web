import { CircleAlert } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

export type FieldErrorItem = {
  fieldId: string;
  message: string;
  /** Field name as the link, message after it ("Title is empty", AdminEditStates). */
  label?: string;
};

type ErrorSummaryProps = {
  title: string;
  errors: FieldErrorItem[];
  ref?: React.Ref<HTMLDivElement>;
};

/**
 * "Please fix N fields" at the top of a form, each item linking to its field. role="alert"
 * announces it; forms move focus here on a failed submit (tabIndex -1).
 */
export function ErrorSummary({ title, errors, ref }: ErrorSummaryProps) {
  if (errors.length === 0) return null;
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 rounded-md border-2 border-brand bg-brand-tint px-[18px] py-4 outline-none"
    >
      <CircleAlert className="size-[22px] text-brand" aria-hidden />
      <div className="flex flex-col gap-1.5">
        <strong className="text-body">{title}</strong>
        <ul className="list-disc pl-[18px] text-small leading-[1.6]">
          {errors.map((error) => (
            <li key={error.fieldId}>
              <a
                href={`#${error.fieldId}`}
                className={cn(
                  'font-medium text-brand-dark',
                  error.label ? 'underline' : 'no-underline hover:underline',
                )}
              >
                {error.label ?? error.message}
              </a>
              {error.label && <> {error.message}</>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
