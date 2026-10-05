'use client';

import { ArrowLeft, CircleAlert, Eye, EyeOff, LoaderCircle, Lock, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { formatDate } from '@/shared/i18n/format';
import { cn } from '@/shared/lib/cn';
import { BrandLogo } from '@/shared/ui/brand-logo';
import { Checkbox, ChoiceLabel } from '@/shared/ui/form/choice';
import { FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/shared/ui/primitives/input-otp';

import { requestPasswordReset, signInAdmin, verifyTwoFactor } from '../../actions/admin-sign-in';

type Step = 'signin' | 'forgot' | 'sent' | 'twofa' | 'backup';
type Alert =
  { kind: 'invalid'; attemptsLeft: number } | { kind: 'locked'; until: string } | { kind: 'notStaff' } | null;

const RESEND_SECONDS = 45;

/** /admin/login: sign in, wrong password, lockout, forgot, link sent, 2-step (AdminLogin, AdminLoginStates). */
export function AdminLogin({ year }: { year: number }) {
  const t = useTranslations('admin.login');
  const router = useRouter();
  const [step, setStep] = React.useState<Step>('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [remember, setRemember] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);
  const [alert, setAlert] = React.useState<Alert>(null);
  const [fieldError, setFieldError] = React.useState<{ email?: string; password?: string; code?: string }>(
    {},
  );
  const [code, setCode] = React.useState('');
  const [resendIn, setResendIn] = React.useState(RESEND_SECONDS);
  const [pending, startTransition] = React.useTransition();
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const codeRef = React.useRef<HTMLInputElement>(null);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  // Move focus to the new step's heading so screen readers hear where they are; the 2-step code
  // box focuses itself instead (typing the code right away is the whole step).
  const firstRender = React.useRef(true);
  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (step !== 'twofa') headingRef.current?.focus();
  }, [step]);

  React.useEffect(() => {
    if (step !== 'sent' || resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [step, resendIn]);

  const go = (next: Step) => {
    setAlert(null);
    setFieldError({});
    setCode('');
    setStep(next);
  };

  const submitSignIn = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await signInAdmin({ email, password, remember });
      if (!result.ok) {
        if (result.error === 'validation') {
          // Actions return message keys (admin.login.errors.*); unknown keys fall back to a generic text.
          const message = (key: string | undefined) =>
            key === undefined ? undefined : t(`errors.${key}` as Parameters<typeof t>[0]);
          setFieldError({
            email: message(result.fieldErrors.email?.[0]),
            password: message(result.fieldErrors.password?.[0]),
          });
        }
        return;
      }
      const outcome = result.data;
      switch (outcome.status) {
        case 'signed_in':
          router.replace('/admin');
          router.refresh();
          return;
        case 'two_factor_required':
          go('twofa');
          return;
        case 'invalid':
          setAlert({ kind: 'invalid', attemptsLeft: outcome.attemptsLeft });
          break;
        case 'locked':
          setAlert({ kind: 'locked', until: outcome.until });
          break;
        case 'not_staff':
          setAlert({ kind: 'notStaff' });
          break;
      }
      // Errors never say which field was wrong; the password is cleared and typed again.
      setPassword('');
      setFieldError({ password: t('errors.typeAgain') });
      passwordRef.current?.focus();
    });
  };

  const submitCode = (event: React.FormEvent) => {
    event.preventDefault();
    const kind = step === 'backup' ? 'backup' : 'totp';
    startTransition(async () => {
      const result = await verifyTwoFactor({ code, kind });
      if (!result.ok) {
        setFieldError({ code: t('errors.codeRequired') });
        return;
      }
      if (result.data.status === 'signed_in') {
        router.replace('/admin');
        router.refresh();
      } else if (result.data.status === 'expired') {
        go('signin');
        setAlert(null);
      } else {
        setFieldError({ code: t(kind === 'totp' ? 'errors.codeWrong' : 'errors.backupWrong') });
        setCode('');
        // Back to the code field so the next code can be typed right away.
        codeRef.current?.focus();
      }
    });
  };

  const submitReset = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await requestPasswordReset({ email });
      if (!result.ok) {
        setFieldError({ email: t('errors.emailInvalid') });
        return;
      }
      setResendIn(RESEND_SECONDS);
      go('sent');
    });
  };

  const heading = (text: string) => (
    <h1 ref={headingRef} tabIndex={-1} className="text-[28px] leading-[1.2] font-bold outline-none">
      {text}
    </h1>
  );

  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[44%_1fr]">
      <aside className="flex items-center bg-brand px-4 py-4 text-white lg:flex-col lg:items-start lg:justify-between lg:px-14 lg:py-12">
        <BrandLogo
          variant="white"
          height={64}
          alt="EESTEC LC Skopje"
          priority
          className="h-12 w-auto lg:h-16"
        />
        <div className="hidden max-w-[400px] flex-col gap-4 lg:flex">
          <p className="text-[36px] leading-[1.2] font-bold">{t('panelTitle')}</p>
          <p className="text-[17px] leading-[1.6] font-medium">{t('panelText')}</p>
        </div>
        <p className="hidden text-small font-medium lg:block">{t('copyright', { year })}</p>
      </aside>

      <main className="flex items-start justify-center px-4 py-10 lg:items-center lg:px-12">
        <div className="flex w-full max-w-[400px] flex-col gap-6 [--control-h:44px]">
          {step === 'signin' && (
            <form onSubmit={submitSignIn} noValidate className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                {heading(t('signInTitle'))}
                <p className="text-small text-muted-ink">{t('signInText')}</p>
              </div>
              {alert && <LoginAlert alert={alert} />}
              <FormField id="admin-email" label={t('email')} error={fieldError.email}>
                {(control) => (
                  <Input
                    {...control}
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={alert?.kind === 'invalid' || control['aria-invalid'] ? true : undefined}
                  />
                )}
              </FormField>
              <div className="flex flex-col">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <label htmlFor="admin-password" className="text-small font-medium">
                    {t('password')}
                  </label>
                  <button
                    type="button"
                    onClick={() => go('forgot')}
                    className="cursor-pointer text-small font-medium text-brand-dark underline"
                  >
                    {t('forgot')}
                  </button>
                </div>
                <FormField
                  id="admin-password"
                  label={<span className="sr-only">{t('password')}</span>}
                  error={fieldError.password}
                  className="[&>label]:mb-0"
                >
                  {(control) => (
                    <div className="relative">
                      <Input
                        {...control}
                        ref={passwordRef}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder={t('password')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                        aria-pressed={showPassword}
                        className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-ink hover:bg-surface"
                      >
                        {showPassword ? (
                          <EyeOff className="size-5" aria-hidden />
                        ) : (
                          <Eye className="size-5" aria-hidden />
                        )}
                      </button>
                    </div>
                  )}
                </FormField>
              </div>
              <ChoiceLabel
                control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
              >
                {t('remember')}
              </ChoiceLabel>
              <SubmitButton pending={pending} disabled={alert?.kind === 'locked'}>
                {t('signIn')}
              </SubmitButton>
              <div className="flex items-center justify-between border-t border-divider pt-5 text-small">
                {/* The public site is a separate root layout: a full page load is intended. */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/" className="text-ink underline">
                  {t('backToSite')}
                </a>
                <span className="text-muted-ink">{t('adminsOnly')}</span>
              </div>
            </form>
          )}

          {step === 'forgot' && (
            <form onSubmit={submitReset} noValidate className="flex flex-col gap-5">
              <BackButton onClick={() => go('signin')} label={t('backToSignIn')} />
              <div className="flex flex-col gap-1">
                {heading(t('forgotTitle'))}
                <p className="text-small text-muted-ink">{t('forgotText')}</p>
              </div>
              <FormField id="admin-reset-email" label={t('email')} error={fieldError.email}>
                {(control) => (
                  <Input
                    {...control}
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                )}
              </FormField>
              <SubmitButton pending={pending}>{t('sendLink')}</SubmitButton>
              <p className="text-small text-muted-ink">{t('noAccess')}</p>
            </form>
          )}

          {step === 'sent' && (
            <div className="flex flex-col gap-5" role="status">
              <span
                aria-hidden
                className="flex size-13 items-center justify-center rounded-full bg-brand-tint text-brand"
              >
                <Mail className="size-6" />
              </span>
              <div className="flex flex-col gap-2">
                {heading(t('sentTitle'))}
                <p className="text-body text-ink-2">
                  {t.rich('sentText', {
                    email,
                    strong: (chunks) => <strong className="text-ink">{chunks}</strong>,
                  })}
                </p>
              </div>
              <Button size="lg" block onClick={() => go('signin')}>
                {t('backToSignIn')}
              </Button>
              <Button
                size="lg"
                variant="quiet"
                block
                disabled={resendIn > 0 || pending}
                onClick={() =>
                  startTransition(async () => {
                    await requestPasswordReset({ email });
                    setResendIn(RESEND_SECONDS);
                  })
                }
              >
                {resendIn > 0
                  ? t('resendIn', { time: `0:${String(resendIn).padStart(2, '0')}` })
                  : t('resend')}
              </Button>
              <p className="text-small text-muted-ink">{t('sentHelp')}</p>
            </div>
          )}

          {(step === 'twofa' || step === 'backup') && (
            <form onSubmit={submitCode} noValidate className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                {heading(t('twoFactorTitle'))}
                <p className="text-small text-muted-ink">
                  {step === 'twofa' ? t('twoFactorText') : t('backupText')}
                </p>
              </div>
              {step === 'twofa' ? (
                <fieldset className="m-0 border-0 p-0">
                  <legend className="mb-1.5 p-0 text-small font-medium">{t('code')}</legend>
                  <InputOTP
                    ref={codeRef}
                    maxLength={6}
                    value={code}
                    onChange={setCode}
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    aria-invalid={fieldError.code ? true : undefined}
                    aria-describedby={fieldError.code ? 'admin-code-error' : undefined}
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          aria-invalid={fieldError.code ? true : undefined}
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {fieldError.code && (
                    <span
                      id="admin-code-error"
                      className="mt-1.5 flex items-center gap-1.5 text-small font-medium text-brand-dark"
                    >
                      <CircleAlert className="size-4" aria-hidden />
                      {fieldError.code}
                    </span>
                  )}
                </fieldset>
              ) : (
                <FormField id="admin-backup" label={t('backupCode')} error={fieldError.code}>
                  {(control) => (
                    <Input
                      {...control}
                      ref={codeRef}
                      autoFocus
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  )}
                </FormField>
              )}
              <SubmitButton pending={pending} disabled={code.trim().length < 6}>
                {t('verify')}
              </SubmitButton>
              <button
                type="button"
                onClick={() => go(step === 'twofa' ? 'backup' : 'twofa')}
                className="w-fit cursor-pointer text-small font-medium text-brand-dark underline"
              >
                {step === 'twofa' ? t('useBackup') : t('useAuthenticator')}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

function LoginAlert({ alert }: { alert: NonNullable<Alert> }) {
  const t = useTranslations('admin.login');
  const time = alert.kind === 'locked' ? formatDate(alert.until, 'en', 'time') : '';
  return (
    <div role="alert" className="flex gap-3 rounded-md border-2 border-brand bg-brand-tint px-4 py-3.5">
      {alert.kind === 'locked' ? (
        <Lock className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
      ) : (
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
      )}
      <div className="flex flex-col gap-0.5 text-small">
        <strong className="text-[15px]">
          {alert.kind === 'invalid' && t('errors.wrongTitle')}
          {alert.kind === 'locked' && t('errors.lockedTitle')}
          {alert.kind === 'notStaff' && t('errors.notStaffTitle')}
        </strong>
        <span>
          {alert.kind === 'invalid' && t('errors.wrongText', { count: alert.attemptsLeft })}
          {alert.kind === 'locked' && t('errors.lockedText', { time })}
          {alert.kind === 'notStaff' && t('errors.notStaffText')}
        </span>
      </div>
    </div>
  );
}

function SubmitButton({
  pending,
  disabled,
  children,
}: {
  pending: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations('admin.login');
  return (
    <Button type="submit" size="lg" block disabled={pending || disabled} aria-busy={pending || undefined}>
      {pending ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden />
          {t('working')}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-fit cursor-pointer items-center gap-2 text-small font-medium text-ink hover:underline',
      )}
    >
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </button>
  );
}
