'use client';

import { Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link } from '@/shared/i18n/navigation';
import { Button, buttonVariants } from '@/shared/ui/primitives/button';

import { AuthCard, AuthTitle } from './auth-shell';

const RESEND_SECONDS = 45;

/**
 * "Check your inbox" (AuthForm › sent): the link is on its way, "Resend" waits 45 seconds, and a way
 * back. `kind` only changes the sentence: a reset link works 30 minutes, a confirmation link 24 hours.
 */
export function CheckInbox({
  email,
  kind,
  onResend,
}: {
  email: string;
  kind: 'reset' | 'confirm';
  /** Sends the link again. */
  onResend: () => Promise<void>;
}) {
  const t = useTranslations('auth.sent');
  const [wait, setWait] = React.useState(RESEND_SECONDS);
  const [again, setAgain] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  React.useEffect(() => headingRef.current?.focus(), []);
  React.useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  const strong = (chunks: React.ReactNode) => <strong className="text-ink">{chunks}</strong>;

  return (
    <AuthCard>
      <span className="flex size-16 items-center justify-center rounded-full bg-brand-tint text-brand">
        <Mail className="size-7" aria-hidden />
      </span>
      <div role="status" className="flex flex-col gap-2">
        <AuthTitle ref={headingRef} tabIndex={-1} className="outline-none">
          {t('title')}
        </AuthTitle>
        <p className="text-body text-muted-ink">
          {t.rich(kind === 'reset' ? 'text' : 'confirmText', { email, strong })}
        </p>
        {again && <p className="text-small font-medium">{t('resentNotice')}</p>}
      </div>
      <div className="flex flex-col gap-2.5">
        <Link href="/login" className={buttonVariants({ size: 'lg' })}>
          {t('back')}
        </Link>
        <Button
          type="button"
          variant="quiet"
          size="lg"
          disabled={wait > 0 || pending}
          onClick={() =>
            startTransition(async () => {
              await onResend();
              setAgain(true);
              setWait(RESEND_SECONDS);
            })
          }
        >
          {wait > 0 ? t('resendIn', { time: `0:${String(wait).padStart(2, '0')}` }) : t('resend')}
        </Button>
      </div>
      <p className="text-small text-muted-ink">
        {t.rich('hint', {
          link: (chunks) => (
            <Link href="/contact" className="font-medium text-brand-dark underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </AuthCard>
  );
}
