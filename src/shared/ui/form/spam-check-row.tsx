import { Check, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/cn';

/**
 * "Checking automatically…" then "Spam check passed" (ContactForm). The check is the honeypot and
 * the minimum filling time: `passed` turns true once that time is over, so the row says what is
 * true. No puzzles, no tracking cookies.
 */
export function SpamCheckRow({ passed }: { passed: boolean }) {
  const t = useTranslations('ui.form.spam');
  return (
    <div className="flex items-center gap-3.5 rounded-sm border border-line px-4 py-3">
      <span
        aria-hidden
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full text-white',
          passed ? 'bg-ink' : 'border-2 border-line-strong bg-white',
        )}
      >
        {passed && <Check className="size-4" strokeWidth={3} />}
      </span>
      <span className="flex flex-1 flex-col">
        <strong aria-live="polite" className="text-[15px] font-medium">
          {passed ? t('passed') : t('checking')}
        </strong>
        <span className="text-[13px] text-muted-ink">{t('note')}</span>
      </span>
      <Shield aria-hidden className="size-5.5 shrink-0 text-muted-ink" />
    </div>
  );
}
