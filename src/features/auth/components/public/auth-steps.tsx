import { Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

export type AuthStep = { label: string; hint?: string; state: 'done' | 'current' | 'todo' };

/** The three steps of sign-up (AuthForm › check-email, pending): a tick, the number you are at, the next one grey. */
export function AuthSteps({ steps }: { steps: AuthStep[] }) {
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={step.state === 'current' ? 'step' : undefined}
          className={cn(
            'relative grid grid-cols-[28px_minmax(0,1fr)] gap-3 pb-4',
            index < steps.length - 1 &&
              "before:absolute before:top-7 before:bottom-0.5 before:left-[13px] before:w-0.5 before:bg-line before:content-['']",
          )}
        >
          <span
            className={cn(
              'relative z-10 flex size-7 items-center justify-center rounded-full text-[13px] font-bold',
              step.state === 'done' && 'bg-ink text-white',
              step.state === 'current' && 'bg-brand text-white',
              step.state === 'todo' && 'border-2 border-line-strong bg-white text-muted-ink',
            )}
          >
            {step.state === 'done' ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : index + 1}
          </span>
          <span className={cn('flex flex-col pt-1', step.state === 'todo' && 'text-muted-ink')}>
            <strong>{step.label}</strong>
            {step.hint && (
              <span className={cn('text-small', step.state !== 'todo' && 'text-muted-ink')}>{step.hint}</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
