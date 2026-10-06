// Spam protection on every public form (docs/ARCHITECTURE.md §7): a honeypot field people never
// see, and a minimum time between showing the form and sending it. Turnstile joins when its keys
// exist (backend phase). Elapsed time is real time, not the pinned mock clock.

export const SPAM_FIELDS = { honeypot: 'website', startedAt: 'form_started_at' } as const;

/** People need longer than this to fill in a form. */
export const MIN_FILL_MS = 3000;

export type SpamVerdict = 'ok' | 'bot' | 'too_fast';

export function checkSpamGuard(data: FormData, nowMs: number = Date.now()): SpamVerdict {
  const honeypot = data.get(SPAM_FIELDS.honeypot);
  if (typeof honeypot === 'string' && honeypot.trim() !== '') return 'bot';
  const startedAt = Number(data.get(SPAM_FIELDS.startedAt));
  if (!Number.isFinite(startedAt) || startedAt <= 0) return 'bot';
  return nowMs - startedAt < MIN_FILL_MS ? 'too_fast' : 'ok';
}
