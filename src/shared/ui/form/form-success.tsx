import { Check } from 'lucide-react';
import * as React from 'react';

type FormSuccessProps = {
  title: React.ReactNode;
  children?: React.ReactNode;
  /** "What happens next": numbered steps. */
  nextTitle?: React.ReactNode;
  steps?: React.ReactNode[];
  /** Summary rows, e.g. Subject / Sent / Reference. */
  details?: { label: React.ReactNode; value: React.ReactNode }[];
  actions?: React.ReactNode;
};

/** Replaces the form after sending (JoinFormStates, ContactStates…). Announced politely. */
export function FormSuccess({ title, children, nextTitle, steps, details, actions }: FormSuccessProps) {
  return (
    <div role="status" className="flex flex-col items-start gap-5">
      <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-brand text-white">
        <Check className="size-8" strokeWidth={2.6} />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="text-[28px] leading-[1.2] font-bold">{title}</h2>
        {children && <div className="text-body text-ink-2">{children}</div>}
      </div>
      {details && details.length > 0 && (
        <dl className="grid w-full grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-md bg-surface p-4 text-small">
          {details.map((row, index) => (
            <React.Fragment key={index}>
              <dt className="text-muted-ink">{row.label}</dt>
              <dd className="font-medium">{row.value}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}
      {steps && steps.length > 0 && (
        <div className="w-full rounded-md bg-surface p-5">
          {nextTitle && <h3 className="mb-3 text-body font-bold">{nextTitle}</h3>}
          <ol className="flex flex-col gap-3">
            {steps.map((step, index) => (
              <li key={index} className="flex gap-3 text-small">
                <span
                  aria-hidden
                  className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-white"
                >
                  {index + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

/** One-line confirmation next to a submit button (Main › Form fields). */
export function SuccessLine({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="flex items-center gap-2.5 rounded-sm bg-surface px-4 py-3 text-small">
      <span
        aria-hidden
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-white"
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
      {children}
    </div>
  );
}
