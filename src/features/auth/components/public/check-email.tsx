'use client';

import { Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Button } from '@/shared/ui/primitives/button';

import { AuthCard, AuthTitle } from './auth-shell';
import { AuthSteps } from './auth-steps';

/** "Confirm your e-mail" (AuthForm › check-email): the account exists, the link is on its way (24 hours). */
export function CheckEmail({
  email,
  onResend,
  onChange,
}: {
  email: string;
  /** Sends the confirmation link again. */
  onResend: () => Promise<void>;
  /** Back to the form with what was typed ("Wrong e-mail? Change it"). */
  onChange: () => void;
}) {
  const t = useTranslations('auth.check');
  const [pending, startTransition] = React.useTransition();
  const [again, setAgain] = React.useState(false);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => titleRef.current?.focus(), []);

  return (
    <AuthCard>
      <span className="flex size-16 items-center justify-center rounded-full bg-brand-tint text-brand">
        <Mail className="size-7" aria-hidden />
      </span>
      <div role="status" className="flex flex-col gap-2">
        <AuthTitle ref={titleRef} tabIndex={-1} className="outline-none">
          {t('title')}
        </AuthTitle>
        <p className="text-body text-muted-ink">
          {t.rich('text', { email, strong: (chunks) => <strong className="text-ink">{chunks}</strong> })}
        </p>
        {again && <p className="text-small font-medium">{t('resent', { email })}</p>}
      </div>
      <AuthSteps
        steps={[
          { label: t('created'), state: 'done' },
          { label: t('confirm'), hint: t('here'), state: 'current' },
          { label: t('approval'), hint: t('approvalHint'), state: 'todo' },
        ]}
      />
      <div className="flex flex-col gap-2.5">
        <Button
          type="button"
          variant="quiet"
          size="lg"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await onResend();
              setAgain(true);
            })
          }
        >
          {t('resend')}
        </Button>
        <button
          type="button"
          onClick={onChange}
          className="cursor-pointer self-center text-small font-medium text-brand-dark hover:underline"
        >
          {t('change')}
        </button>
      </div>
    </AuthCard>
  );
}
