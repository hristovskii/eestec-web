'use client';

import { Link2Off } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { type FieldErrors } from '@/shared/forms/action-result';
import { FormField } from '@/shared/ui/form/form-field';
import { SubmitButton } from '@/shared/ui/form/submit-button';
import { Input } from '@/shared/ui/primitives/input';

import { requestMemberPasswordReset, resendConfirmationEmail } from '../../actions/member-sign-in';
import { formText } from '../../domain/form-text';
import { AuthCard, AuthTitle } from './auth-shell';
import { CheckInbox } from './check-inbox';

const KNOWN_ERRORS = ['required', 'email'];

/**
 * "This link has expired" (AuthForm › expired): ask for a new link. The answer is the same for every
 * address; then the screen is "Check your inbox".
 */
export function ExpiredFlow({ type }: { type: 'confirm' | 'reset' }) {
  const t = useTranslations('auth.expired');
  const tErrors = useTranslations('auth.errors');
  const locale = useLocale();
  const [sending, startSending] = React.useTransition();
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FieldErrors>({});

  const send = (email: string) =>
    (type === 'confirm'
      ? resendConfirmationEmail({ email })
      : requestMemberPasswordReset({ email, locale })
    ).catch(() => null);

  if (sentTo)
    return <CheckInbox email={sentTo} kind={type} onResend={async () => void (await send(sentTo))} />;

  const key = errors.email?.[0];

  return (
    <AuthCard>
      <span className="flex size-16 items-center justify-center rounded-full bg-surface text-ink">
        <Link2Off className="size-7" aria-hidden />
      </span>
      <div role="status" className="flex flex-col gap-2">
        <AuthTitle>{t('title')}</AuthTitle>
        <p className="text-body text-muted-ink">{t('text')}</p>
      </div>
      <form
        noValidate
        aria-label={t('title')}
        aria-busy={sending || undefined}
        className="flex flex-col gap-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          const email = formText(new FormData(event.currentTarget), 'email').trim();
          if (!email) return setErrors({ email: ['required'] });
          setErrors({});
          startSending(async () => {
            const response = await send(email);
            if (response && !response.ok && response.error === 'validation')
              return setErrors(response.fieldErrors);
            setSentTo(email);
          });
        }}
      >
        <FormField
          id="expired-email"
          label={t('email')}
          error={key ? tErrors((KNOWN_ERRORS.includes(key) ? key : 'email') as 'email') : undefined}
        >
          {(control) => (
            <Input
              {...control}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
            />
          )}
        </FormField>
        <SubmitButton sending={sending} className="w-full">
          {t('submit')}
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
