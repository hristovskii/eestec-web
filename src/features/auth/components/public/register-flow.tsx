'use client';

import { CircleAlert, User } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { type FieldErrors, fieldErrorsFrom } from '@/shared/forms/action-result';
import { SPAM_FIELDS } from '@/shared/forms/spam-guard';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';
import { ConsentField } from '@/shared/ui/form/consent-field';
import { ErrorSummary, type FieldErrorItem } from '@/shared/ui/form/error-summary';
import { FieldError, FormField } from '@/shared/ui/form/form-field';
import { PasswordInput, PasswordRules } from '@/shared/ui/form/password-field';
import { SegmentedChoice } from '@/shared/ui/form/segmented-choice';
import { Honeypot, SubmitButton } from '@/shared/ui/form/submit-button';
import { Notice } from '@/shared/ui/notice';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { resendConfirmationEmail } from '../../actions/member-sign-in';
import { registerMember } from '../../actions/register-member';
import { formText } from '../../domain/form-text';
import { checkPassword } from '../../domain/password';
import {
  photoProblem,
  readRegisterForm,
  REGISTER_FIELDS,
  REGISTER_LIMITS,
  type RegisterFailure,
} from '../../domain/register-form';
import { MEMBER_YEARS, type MemberVisibility } from '../../types';
import { AuthCard, AuthHeading } from './auth-shell';
import { CheckEmail } from './check-email';

// The schema (and zod with it, about 90 KB) is fetched when the form is first used, not with the page.
const loadSchema = () => import('../../schemas/register.schema');

const ID = 'reg';
const idOf = (path: string) => `${ID}-${path}`;
const KNOWN_ERRORS = [
  'required',
  'tooLong',
  'email',
  'phone',
  'year',
  'consent',
  'passwordShort',
  'passwordPersonal',
  'passwordCommon',
  'emailTaken',
  'photoType',
  'photoSize',
  'invalid',
];
const ORDER = [
  'name',
  'email',
  'password',
  'faculty',
  'phone',
  'year',
  'photo',
  'visibility',
  'consent',
] as const;

type Saved = {
  name: string;
  email: string;
  faculty: string;
  phone: string;
  year: string;
  visibility: MemberVisibility;
};
const EMPTY: Saved = { name: '', email: '', faculty: '', phone: '', year: '', visibility: 'members' };

/**
 * /register (AuthForm › register, register-errors, check-email): the sign-up form, checked in the
 * browser with the same schema as the server, an error summary that takes focus, then "Confirm your
 * e-mail". "Wrong e-mail? Change it" comes back to the form with what was typed.
 */
export function RegisterFlow({ faculties, siteName }: { faculties: string[]; siteName: string }) {
  const t = useTranslations('auth.register');
  const tErrors = useTranslations('auth.errors');
  const tRules = useTranslations('auth.rules');
  const tUi = useTranslations('ui.form');
  const locale = useLocale();
  const [sending, startSending] = React.useTransition();
  const [saved, setSaved] = React.useState<Saved>(EMPTY);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [year, setYear] = React.useState<string[]>([]);
  const [visibility, setVisibility] = React.useState<MemberVisibility>('members');
  const [photo, setPhoto] = React.useState<{ file: File; url: string } | null>(null);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [failure, setFailure] = React.useState<RegisterFailure | null>(null);
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const startedAt = React.useRef(0);
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const failureRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Spam guard: the time the form was shown (people need a few seconds to fill it in).
  React.useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  React.useEffect(() => {
    if (failure) failureRef.current?.focus();
  }, [failure]);
  React.useEffect(() => {
    if (Object.keys(errors).length > 0) summaryRef.current?.focus();
  }, [errors]);
  // The preview's address is released when the photo changes or the form goes away.
  React.useEffect(() => () => (photo ? URL.revokeObjectURL(photo.url) : undefined), [photo]);

  const messageFor = (path: string) => {
    const key = errors[path]?.[0];
    if (!key) return undefined;
    return tErrors((KNOWN_ERRORS.includes(key) ? key : 'invalid') as 'required');
  };
  // "Already registered. Log in instead?" carries a link (drawn that way).
  const emailError =
    errors.email?.[0] === 'emailTaken'
      ? tErrors.rich('emailTaken', {
          link: (chunks) => (
            <Link href="/login" className="underline">
              {chunks}
            </Link>
          ),
        })
      : messageFor('email');
  const labelOf = {
    name: t('name'),
    email: t('email'),
    password: t('password'),
    faculty: t('faculty'),
    phone: t('phone'),
    year: t('year'),
    photo: t('photo'),
    visibility: t('visibility'),
    consent: t('consentShort'),
  } as const;
  const summary: FieldErrorItem[] = ORDER.filter((path) => errors[path]).map((path) => {
    const key = errors[path]?.[0] ?? 'invalid';
    return {
      fieldId: idOf(path),
      label: labelOf[path],
      message: t(`summary.${KNOWN_ERRORS.includes(key) ? key : 'invalid'}` as 'summary.required'),
    };
  });

  const checks = checkPassword(password, { email, name });
  const rules = [
    { id: 'length', label: tRules('length'), ok: checks.length },
    { id: 'personal', label: tRules('personal'), ok: password !== '' && checks.personal },
    { id: 'common', label: tRules('common'), ok: password !== '' && checks.common },
  ];

  function choosePhoto(file: File | null) {
    const problem = photoProblem(file);
    if (file && problem) {
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = '';
      setErrors((current) => ({ ...current, photo: [problem] }));
      return;
    }
    setErrors(({ photo: _removed, ...rest }) => rest);
    setPhoto(file ? { file, url: URL.createObjectURL(file) } : null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set(SPAM_FIELDS.startedAt, String(startedAt.current));
    data.set('locale', locale);
    // The photo is sent from the state (the input is cleared when its file is refused).
    data.delete(REGISTER_FIELDS.photo);
    if (photo) data.set(REGISTER_FIELDS.photo, photo.file);
    setFailure(null);
    const { registerSchema } = await loadSchema();
    const checked = registerSchema.safeParse(readRegisterForm(data));
    const problem = photoProblem(photo?.file ?? null);
    if (!checked.success || problem) {
      const found = checked.success ? {} : fieldErrorsFrom(checked.error.issues);
      setErrors(problem ? { ...found, photo: [problem] } : found);
      return;
    }
    setErrors({});
    startSending(async () => {
      const response = await registerMember(data).catch(() => null);
      if (response?.ok) {
        setSaved({
          name,
          email,
          faculty: formText(data, REGISTER_FIELDS.faculty),
          phone: formText(data, REGISTER_FIELDS.phone),
          year: year[0] ?? '',
          visibility,
        });
        setSentTo(response.data.email);
        return;
      }
      if (response && !response.ok && response.error === 'validation') return setErrors(response.fieldErrors);
      setFailure(
        response && !response.ok && response.error === 'conflict' && response.message
          ? (response.message as RegisterFailure)
          : 'unexpected',
      );
    });
  }

  if (sentTo)
    return (
      <CheckEmail
        email={sentTo}
        onResend={async () => void (await resendConfirmationEmail({ email: sentTo }).catch(() => null))}
        onChange={() => {
          // The form comes back with what was typed (the password and the photo are asked again).
          setName(saved.name);
          setEmail(saved.email);
          setYear(saved.year ? [saved.year] : []);
          setVisibility(saved.visibility);
          setPassword('');
          setPhoto(null);
          setSentTo(null);
        }}
      />
    );

  const visibilityOptions: { value: MemberVisibility; title: string; text: string }[] = [
    { value: 'public', title: t('visPublic.title'), text: t('visPublic.text') },
    { value: 'members', title: t('visMembers.title'), text: t('visMembers.text') },
  ];

  return (
    <AuthCard>
      <AuthHeading
        title={t('title')}
        lead={t.rich('lead', {
          link: (chunks) => (
            <Link href="/join" className="font-medium text-brand-dark no-underline hover:underline">
              {chunks}
            </Link>
          ),
        })}
      />

      {failure && (
        <div ref={failureRef} tabIndex={-1} className="outline-none">
          <Notice tone="urgent" role="alert" icon={<CircleAlert className="size-[22px] text-brand" />}>
            {t(`failed.${failure}`)}
          </Notice>
        </div>
      )}

      <form
        noValidate
        onSubmit={onSubmit}
        onFocus={() => void loadSchema()}
        aria-label={t('title')}
        aria-busy={sending || undefined}
        className="grid gap-x-5 gap-y-5 sm:grid-cols-2"
      >
        <Honeypot name={SPAM_FIELDS.honeypot} />
        <div className="sm:col-span-2 [&:empty]:hidden">
          <ErrorSummary
            ref={summaryRef}
            title={tUi('errorSummary', { count: summary.length })}
            errors={summary}
          />
        </div>

        <FormField id={idOf('name')} label={t('name')} required error={messageFor('name')}>
          {(control) => (
            <Input
              {...control}
              name={REGISTER_FIELDS.name}
              autoComplete="name"
              maxLength={REGISTER_LIMITS.name}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </FormField>
        <FormField id={idOf('email')} label={t('email')} required error={emailError}>
          {(control) => (
            <Input
              {...control}
              name={REGISTER_FIELDS.email}
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              maxLength={REGISTER_LIMITS.email}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          )}
        </FormField>

        <div className="sm:col-span-2">
          <FormField id={idOf('password')} label={t('password')} required error={messageFor('password')}>
            {(control) => (
              <PasswordInput
                {...control}
                name={REGISTER_FIELDS.password}
                autoComplete="new-password"
                aria-describedby={[control['aria-describedby'], idOf('rules')].filter(Boolean).join(' ')}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            )}
          </FormField>
          <PasswordRules id={idOf('rules')} rules={rules} />
        </div>

        <FormField id={idOf('faculty')} label={t('faculty')} required error={messageFor('faculty')}>
          {(control) => (
            <NativeSelect {...control} name={REGISTER_FIELDS.faculty} defaultValue={saved.faculty}>
              <NativeSelectOption value="">{t('choose')}</NativeSelectOption>
              {faculties.map((faculty) => (
                <NativeSelectOption key={faculty} value={faculty}>
                  {faculty}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField id={idOf('phone')} label={t('phone')} optional error={messageFor('phone')}>
          {(control) => (
            <Input
              {...control}
              name={REGISTER_FIELDS.phone}
              type="tel"
              autoComplete="tel"
              placeholder="07X XXX XXX"
              maxLength={REGISTER_LIMITS.phone}
              defaultValue={saved.phone}
            />
          )}
        </FormField>

        <div className="sm:col-span-2">
          <SegmentedChoice
            name={REGISTER_FIELDS.year}
            id={idOf('year')}
            legend={t('year')}
            type="radio"
            required
            options={MEMBER_YEARS.map((value) => ({ value, label: t(`years.${value}`) }))}
            value={year}
            onChange={setYear}
            error={messageFor('year')}
          />
        </div>

        <div className="flex flex-col sm:col-span-2">
          <span id={idOf('photo-label')} className="mb-1.5 text-small font-medium">
            {t('photo')} <span className="font-normal text-muted-ink">· {t('photoOptional')}</span>
          </span>
          <div className="flex items-center gap-4">
            <span className="flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[repeating-linear-gradient(135deg,var(--color-divider)_0_12px,var(--color-line)_12px_24px)] text-muted-ink">
              {photo ? (
                // A preview of the person's own file, made in the browser: nothing to optimise.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt={t('photoPreview')} className="size-full object-cover" />
              ) : (
                <User className="size-[22px]" aria-hidden />
              )}
            </span>
            <div className="flex flex-col gap-1.5">
              <span className="flex flex-wrap gap-2">
                <Button type="button" variant="quiet" size="sm" onClick={() => fileRef.current?.click()}>
                  {photo ? t('photoChange') : t('photoUpload')}
                </Button>
                {photo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      choosePhoto(null);
                      if (fileRef.current) fileRef.current.value = '';
                    }}
                  >
                    {t('photoRemove')}
                  </Button>
                )}
              </span>
              <span className="text-small text-muted-ink">{t('photoHelp')}</span>
            </div>
            <input
              ref={fileRef}
              id={idOf('photo')}
              type="file"
              accept="image/jpeg,image/png"
              aria-labelledby={idOf('photo-label')}
              aria-invalid={errors.photo ? true : undefined}
              aria-describedby={errors.photo ? idOf('photo-error') : undefined}
              className="sr-only"
              onChange={(event) => choosePhoto(event.target.files?.[0] ?? null)}
            />
          </div>
          {errors.photo && <FieldError id={idOf('photo-error')}>{messageFor('photo')}</FieldError>}
        </div>

        <fieldset id={idOf('visibility')} className="min-w-0 sm:col-span-2">
          <legend className="mb-1.5 text-small font-medium">
            {t('visibility')}
            <span className="text-brand-dark" aria-hidden>
              {' '}
              *
            </span>
          </legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {visibilityOptions.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'grid cursor-pointer grid-cols-[24px_minmax(0,1fr)] gap-2.5 rounded-[10px] border bg-white px-4 py-3.5',
                  option.value === visibility
                    ? 'border-2 border-brand bg-brand-tint px-[15px] py-[13px]'
                    : 'border-line-input',
                )}
              >
                <input
                  type="radio"
                  name={REGISTER_FIELDS.visibility}
                  value={option.value}
                  checked={option.value === visibility}
                  onChange={() => setVisibility(option.value)}
                  className="mt-0.5 size-5 cursor-pointer accent-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
                />
                <span className="flex flex-col gap-0.5">
                  <strong className="text-[15px]">{option.title}</strong>
                  <span className="text-small text-muted-ink">{option.text}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-small text-muted-ink">{t('visHelp')}</p>
        </fieldset>

        <ConsentField
          id={idOf('consent')}
          name={REGISTER_FIELDS.consent}
          error={messageFor('consent')}
          className="sm:col-span-2"
        >
          {t.rich('consent', {
            site: siteName,
            link: (chunks) => (
              <Link href="/privacy" className="font-medium text-brand-dark underline">
                {chunks}
              </Link>
            ),
          })}
          <span className="text-brand-dark" aria-hidden>
            {' '}
            *
          </span>
        </ConsentField>

        <div className="flex flex-col gap-3.5 sm:col-span-2">
          <SubmitButton sending={sending} className="w-full">
            {t('submit')}
          </SubmitButton>
          <p className="text-center text-[15px]">
            {t('haveAccount')}{' '}
            <Link href="/login" className="font-medium text-brand-dark no-underline hover:underline">
              {t('login')}
            </Link>
          </p>
        </div>
      </form>
    </AuthCard>
  );
}
