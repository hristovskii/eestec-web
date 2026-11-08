'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import { type FieldErrors } from '@/shared/forms/action-result';
import { useRouter } from '@/shared/i18n/navigation';
import { FormField } from '@/shared/ui/form/form-field';
import { PasswordInput, PasswordMeter } from '@/shared/ui/form/password-field';
import { SubmitButton } from '@/shared/ui/form/submit-button';
import { Notice } from '@/shared/ui/notice';

import { resetMemberPassword } from '../../actions/member-sign-in';
import { passwordStrength } from '../../domain/password';
import { AuthCard, AuthHeading } from './auth-shell';

const LEVELS = ['', 'weak', 'fair', 'good', 'strong'] as const;
const KNOWN_ERRORS = ['required', 'passwordShort', 'passwordPersonal', 'passwordCommon'];

/** /reset-password (AuthForm › reset): a new password with the strength bars, then signed in. */
export function ResetForm({ token, email, name }: { token: string; email: string; name: string }) {
  const t = useTranslations('auth.reset');
  const tStrength = useTranslations('auth.strength');
  const tErrors = useTranslations('auth.errors');
  const router = useRouter();
  const [sending, startSending] = React.useTransition();
  const [password, setPassword] = React.useState('');
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [boardSaved, setBoardSaved] = React.useState(false);

  const level = passwordStrength(password, { email, name });
  const key = errors.password?.[0];

  if (boardSaved)
    return (
      <AuthCard>
        <AuthHeading title={t('title')} />
        <Notice role="status" tone="info">
          {t('savedBoard')}
        </Notice>
        {/* /admin is a separate root layout without a locale: a full page load is intended. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/admin/login" className="font-medium text-brand-dark underline">
          {t('savedBoardLink')}
        </a>
      </AuthCard>
    );

  return (
    <AuthCard>
      <AuthHeading title={t('title')} lead={t('lead', { email })} />
      <form
        noValidate
        aria-label={t('title')}
        aria-busy={sending || undefined}
        className="flex flex-col gap-4.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!password) return setErrors({ password: ['required'] });
          setErrors({});
          startSending(async () => {
            const response = await resetMemberPassword({ token, password }).catch(() => null);
            if (!response) return setErrors({ password: ['invalid'] });
            if (!response.ok) {
              if (response.error === 'validation') return setErrors(response.fieldErrors);
              return setErrors({ password: ['invalid'] });
            }
            if (response.data.status === 'expired') return router.replace('/auth/expired?type=reset');
            if (!response.data.signedIn) return setBoardSaved(true);
            router.replace('/');
            router.refresh();
          });
        }}
      >
        <FormField
          id="reset-password"
          label={t('password')}
          error={key ? tErrors((KNOWN_ERRORS.includes(key) ? key : 'invalid') as 'required') : undefined}
        >
          {(control) => (
            <PasswordInput
              {...control}
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </FormField>
        <PasswordMeter
          level={level}
          label={
            level > 0
              ? t.rich('strength', {
                  level: tStrength(LEVELS[level] as 'weak'),
                  strong: (chunks) => <strong>{chunks}</strong>,
                })
              : null
          }
        />
        <SubmitButton sending={sending} className="w-full">
          {t('submit')}
        </SubmitButton>
      </form>
      <p className="text-small text-muted-ink">{t('note')}</p>
    </AuthCard>
  );
}
