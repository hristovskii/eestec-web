'use client';

import { FlaskConical, X } from 'lucide-react';
import * as React from 'react';

import { type AdminRole, type MemberStatus, switchMockPersona } from '@/features/auth';
import { useRouter } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';

import { resetSampleData } from '../actions/reset-sample-data';

export type DevPersona = {
  personaId: string;
  label: string;
  name: string;
  adminRole: AdminRole | null;
  memberStatus: MemberStatus | null;
};

type DevToolbarProps = {
  personas: DevPersona[];
  currentPersonaId: string | null;
  /** The pinned mock clock, if any (ISO). */
  pinnedNow: string | null;
  phase2: boolean;
};

/**
 * Dev / preview only (English, not translated): sign in as a sample persona, reset sample data,
 * see the mock clock and the phase flag. Never rendered in production.
 */
export function DevToolbar({ personas, currentPersonaId, pinnedNow, phase2 }: DevToolbarProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const run = (action: () => Promise<void>) =>
    startTransition(async () => {
      await action();
      router.refresh();
    });

  const options: { id: string | null; label: string; detail: string }[] = [
    { id: null, label: 'Visitor', detail: 'not logged in' },
    ...personas.map((p) => ({ id: p.personaId, label: p.label, detail: p.name })),
  ];

  return (
    <div className="fixed bottom-16 left-4 z-50 text-small text-ink" data-devtools>
      {open ? (
        <div className="w-72 rounded-md border border-line bg-white p-4 shadow-menu">
          <div className="mb-3 flex items-center justify-between">
            <strong>Dev tools</strong>
            <button
              type="button"
              aria-label="Close dev tools"
              onClick={() => setOpen(false)}
              className="flex size-8 cursor-pointer items-center justify-center rounded-sm hover:bg-surface"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <fieldset disabled={pending || !phase2} className="flex flex-col gap-1">
            <legend className="mb-1.5 font-medium">Signed in as</legend>
            {!phase2 && (
              <p className="mb-1 text-muted-ink">Member accounts are off (set FEATURE_FLAGS=phase2).</p>
            )}
            {options.map((option) => (
              <label
                key={option.id ?? 'visitor'}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-surface',
                  option.id === currentPersonaId && 'bg-brand-tint',
                )}
              >
                <input
                  type="radio"
                  name="persona"
                  className="accent-brand"
                  checked={option.id === currentPersonaId}
                  onChange={() => run(() => switchMockPersona(option.id))}
                />
                <span>
                  {option.label} <span className="text-muted-ink">· {option.detail}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="mt-3 flex flex-col gap-1 border-t border-divider pt-3 text-muted-ink">
            <span>
              Clock: {pinnedNow ? `pinned to ${pinnedNow.replace('T', ' ').slice(0, 16)} UTC` : 'real'}
            </span>
            <span>Phase 2 pages: {phase2 ? 'on' : 'off'}</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(resetSampleData)}
              className="mt-1 w-fit cursor-pointer font-medium text-brand-dark hover:underline"
            >
              Reset sample data
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open dev tools"
          className="flex h-10 cursor-pointer items-center gap-2 rounded-full bg-ink px-4 font-medium text-white shadow-menu"
        >
          <FlaskConical className="size-4" aria-hidden />
          Dev
        </button>
      )}
    </div>
  );
}
