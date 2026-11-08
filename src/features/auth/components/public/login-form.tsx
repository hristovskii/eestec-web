'use client';

import { CircleAlert, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { type FieldErrors } from '@/shared/forms/action-result';
import { Link, useRouter } from '@/shared/i18n/navigation';
import { Checkbox, ChoiceLabel } from '@/shared/ui/form/choice';
import { FormField } from '@/shared/ui/form/form-field';
import { PasswordInput } from '@/shared/ui/form/password-field';
import { SubmitButton } from '@/shared/ui/form/submit-button';
import { Notice } from '@/shared/ui/notice';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';

import { resendConfirmationEmail, signInMember } from '../../actions/member-sign-in';
import { formText } from '../../domain/form-text';
import type { SignInMemberResult } from '../../types';
import { AuthCard, AuthHeading } from './auth-shell';

type Failure =
  | { kind: 'invalid' | 'adminLogin' | 'unavailable' | 'unexpected' | 'unconfirmed' }
  | { kind: 'locked'; minutes: number }
  | { kind: 'rejected'; reason: string | null };

const KNOWN_ERRORS = ['required', 'email', 'tooLong', 'invalid'];

/**
 * /login (AuthForm › login, login-error, login-pending): e-mail, password with the eye, "Keep me
 * logged in", and one notice above the form for what went wrong. `pending` shows the "waiting for
 * board approval" notice (a pending member who opens /login).
 */
export function LoginForm({ pending, next }: { pending: boolean; next: string }) {
  const t = useTranslations('auth.login');
  const tErrors = useTranslations('auth.errors');
  const router = useRouter();
  const [sending, startSending] = React.useTransition();
  const [email, setEmail] = React.useState('');
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [failure, setFailure] = React.useState<Failure | null>(null);
  const [resent, setResent] = React.useState(false);
  const noticeRef = React.useRef<HTMLDivElement>(null);

  // The notice takes focus once it is on the page (not on a timer: that raced with rendering).
  React.useEffect(() => {
    if (failure) noticeRef.current?.focus();
  }, [failure]);

  const messageFor = (path: string) => {
    const key = errors[path]?.[0];
    if (!key) return undefined;
    return tErrors((KNOWN_ERRORS.includes(key) ? key : 'invalid') as 'required');
  };

  function failureOf(result: SignInMemberResult): Failure | null {
    switch (result.status) {
      case 'invalid':
      case 'unconfirmed':
      case 'unavailable':
      case 'use_admin_login':
        return { kind: result.status === 'use_admin_login' ? 'adminLogin' : result.status };
      case 'locked':
        return { kind: 'locked', minutes: result.minutes };
      case 'rejected':
        return { kind: 'rejected', reason: result.reason };
      case 'signed_in':
        return null;
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = {
      email: formText(data, 'email'),
      password: formText(data, 'password'),
      remember: data.get('remember') !== null,
    };
    setFailure(null);
    setResent(false);
    const missing: FieldErrors = {};
    if (!values.email.trim()) missing.email = ['required'];
    if (!values.password) missing.password = ['required'];
    setErrors(missing);
    if (Object.keys(missing).length > 0) return;
    startSending(async () => {
      const response = await signInMember(values).catch(() => null);
      if (!response) return setFailure({ kind: 'unexpected' });
      if (!response.ok) {
        if (response.error === 'validation') return setErrors(response.fieldErrors);
        return setFailure({ kind: 'unexpected' });
      }
      const result = response.data;
      if (result.status === 'signed_in') {
        // A pending member lands on the "waiting for approval" page; others where they were going.
        router.replace(result.memberStatus === 'pending' ? '/register/pending' : next);
        router.refresh();
        return;
      }
      setFailure(failureOf(result));
    });
  }

  const forgotLink = (chunks: React.ReactNode) => (
    <Link href="/forgot-password" className="font-medium text-brand-dark underline">
      {chunks}
    </Link>
  );
  const contactLink = (chunks: React.ReactNode) => (
    <Link href="/contact" className="font-medium text-brand-dark underline">
      {chunks}
    </Link>
  );
  const adminLink = (chunks: React.ReactNode) => (
    // /admin is a separate root layout without a locale: a full page load is intended.
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a href="/admin/login" className="font-medium text-brand-dark underline">
      {chunks}
    </a>
  );

  return (
    <AuthCard>
      <AuthHeading title={t('title')} lead={t('lead')} />

      {pending && (
        <Notice role="status" icon={<Clock className="size-[22px]" />} title={t('pending.title')}>
          {t('pending.text')}
        </Notice>
      )}

      {failure && (
        <div ref={noticeRef} tabIndex={-1} className="outline-none">
          <Notice
            tone="urgent"
            role="alert"
            icon={<CircleAlert className="size-[22px] text-brand" />}
            title={t(`failed.${failure.kind}.title` as 'failed.invalid.title')}
            actions={
              failure.kind === 'unconfirmed' ? (
                <Button
                  type="button"
                  variant="quiet"
                  size="sm"
                  disabled={sending || resent}
                  onClick={() =>
                    startSending(async () => {
                      await resendConfirmationEmail({ email }).catch(() => null);
                      setResent(true);
                    })
                  }
                >
                  {t('failed.unconfirmed.resend')}
                </Button>
              ) : undefined
            }
          >
            {failure.kind === 'locked' &&
              t.rich('failed.locked.text', { minutes: failure.minutes, link: forgotLink })}
            {failure.kind === 'invalid' && t.rich('failed.invalid.text', { link: forgotLink })}
            {failure.kind === 'adminLogin' && t.rich('failed.adminLogin.text', { link: adminLink })}
            {failure.kind === 'rejected' &&
              (failure.reason
                ? t('failed.rejected.text', { reason: failure.reason })
                : t.rich('failed.rejected.textNoReason', { link: contactLink }))}
            {failure.kind === 'unconfirmed' &&
              (resent ? t('failed.unconfirmed.resent', { email }) : t('failed.unconfirmed.text'))}
            {(failure.kind === 'unavailable' || failure.kind === 'unexpected') &&
              t(`failed.${failure.kind}.text`)}
          </Notice>
        </div>
      )}

      <form
        noValidate
        onSubmit={onSubmit}
        aria-label={t('title')}
        aria-busy={sending || undefined}
        className="flex flex-col gap-4.5"
      >
        <FormField id="login-email" label={t('email')} error={messageFor('email')}>
          {(control) => (
            <Input
              {...control}
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          )}
        </FormField>
        <div className="relative flex flex-col">
          {/* Beside the label, not inside it: a link in a label would become part of the field's name. */}
          <Link
            href="/forgot-password"
            className="absolute top-0 right-0 text-small font-medium text-brand-dark no-underline hover:underline"
          >
            {t('forgot')}
          </Link>
          <FormField id="login-password" label={t('password')} error={messageFor('password')}>
            {(control) => (
              <PasswordInput
                {...control}
                name="password"
                autoComplete="current-password"
                placeholder={t('passwordPlaceholder')}
              />
            )}
          </FormField>
        </div>
        <ChoiceLabel control={<Checkbox name="remember" defaultChecked />} className="text-[15px]">
          {t('remember')}
        </ChoiceLabel>
        <SubmitButton sending={sending} className="w-full">
          {t('submit')}
        </SubmitButton>
      </form>

      <p className="border-t border-divider pt-4.5 text-center text-[15px]">
        {t('noAccount')}{' '}
        <Link href="/register" className="font-medium text-brand-dark no-underline hover:underline">
          {t('create')}
        </Link>
      </p>
    </AuthCard>
  );
}
