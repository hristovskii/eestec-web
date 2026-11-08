'use client';

import { ArrowLeft } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { type FieldErrors } from '@/shared/forms/action-result';
import { Link } from '@/shared/i18n/navigation';
import { FormField } from '@/shared/ui/form/form-field';
import { SubmitButton } from '@/shared/ui/form/submit-button';
import { Input } from '@/shared/ui/primitives/input';

import { requestMemberPasswordReset } from '../../actions/member-sign-in';
import { formText } from '../../domain/form-text';
import { AuthCard, AuthHeading } from './auth-shell';
import { CheckInbox } from './check-inbox';

const KNOWN_ERRORS = ['required', 'email'];

/** /forgot-password then "Check your inbox" (AuthForm › forgot, sent). The answer is the same for every address. */
export function ForgotFlow() {
  const t = useTranslations('auth.forgot');
  const tErrors = useTranslations('auth.errors');
  const locale = useLocale();
  const [sending, startSending] = React.useTransition();
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FieldErrors>({});

  const send = async (email: string) => {
    const response = await requestMemberPasswordReset({ email, locale }).catch(() => null);
    return response;
  };

  if (sentTo)
    return <CheckInbox email={sentTo} kind="reset" onResend={async () => void (await send(sentTo))} />;

  const key = errors.email?.[0];

  return (
    <AuthCard>
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 self-start text-small font-medium text-ink no-underline hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('back')}
      </Link>
      <AuthHeading title={t('title')} lead={t('lead')} />
      <form
        noValidate
        aria-label={t('title')}
        aria-busy={sending || undefined}
        className="flex flex-col gap-4.5"
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
          id="forgot-email"
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
