'use client';

import { CircleAlert } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { AddToCalendar } from '@/features/applications';
import { type FieldErrors, fieldErrorsFrom } from '@/shared/forms/action-result';
import { SPAM_FIELDS } from '@/shared/forms/spam-guard';
import { Link } from '@/shared/i18n/navigation';
import { ConsentField } from '@/shared/ui/form/consent-field';
import { ErrorSummary, type FieldErrorItem } from '@/shared/ui/form/error-summary';
import { FormField } from '@/shared/ui/form/form-field';
import { FormSuccess } from '@/shared/ui/form/form-success';
import { SegmentedChoice } from '@/shared/ui/form/segmented-choice';
import { Honeypot, SubmitButton } from '@/shared/ui/form/submit-button';
import { Notice } from '@/shared/ui/notice';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { type MembershipReceipt, submitMembership } from '../../actions/submit-membership';
import {
  buildMembershipSchema,
  MEMBERSHIP_FIELDS,
  MEMBERSHIP_LIMITS,
  type MembershipFailure,
  readMembershipForm,
  YEARS_OF_STUDY,
} from '../../domain/membership';
import type { PublicJoin } from '../../types';

type JoinFormProps = {
  apply: PublicJoin['apply'];
  siteName: string;
  /** The next weekly meeting, for the confirmation; null when Settings does not show it. */
  meeting: { sentence: string; google: string; ics: string } | null;
};

const ID = 'join';
const idOf = (path: string) => `${ID}-${path}`;

/**
 * The membership application form (JoinForm › all states): checked in the browser with the same
 * schema as the server, an error summary that takes focus, "Sending…", then the confirmation. The
 * closed state is `JoinClosed`, drawn by the section when applications are off.
 */
export function JoinForm({ apply, siteName, meeting }: JoinFormProps) {
  const t = useTranslations('join.form');
  const tUi = useTranslations('ui.form');
  const tCalendar = useTranslations('join.success');
  const locale = useLocale();
  const [sending, startSending] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [failure, setFailure] = React.useState<MembershipFailure | null>(null);
  const [receipt, setReceipt] = React.useState<MembershipReceipt | null>(null);
  const [interests, setInterests] = React.useState<string[]>([]);
  const startedAt = React.useRef(0);
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const failureRef = React.useRef<HTMLDivElement>(null);
  const successRef = React.useRef<HTMLDivElement>(null);

  const schema = React.useMemo(
    () =>
      buildMembershipSchema({
        faculties: apply.faculties.map((option) => option.value),
        interests: apply.interests.map((option) => option.value),
        heardFrom: apply.heardFrom.map((option) => option.value),
      }),
    [apply],
  );

  // Spam guard: the time the form was shown (people need a few seconds to fill it in).
  React.useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const messageFor = (path: string) => {
    const key = errors[path]?.[0];
    if (!key) return undefined;
    const known = ['required', 'tooLong', 'email', 'phone', 'year', 'consent', 'invalid'];
    return t(`errors.${known.includes(key) ? key : 'invalid'}` as 'errors.required', {
      max: path === 'name' ? MEMBERSHIP_LIMITS.name : MEMBERSHIP_LIMITS.program,
    });
  };

  const order = [
    'name',
    'email',
    'phone',
    'faculty',
    'program',
    'year',
    'interests',
    'heardFrom',
    'consent',
  ] as const;
  const labelOf = {
    name: t('name'),
    email: t('email'),
    phone: t('phone'),
    faculty: t('faculty'),
    program: t('program'),
    year: t('year'),
    interests: t('interests'),
    heardFrom: t('heardFrom'),
    consent: t('consentShort'),
  } as const;
  const summary: FieldErrorItem[] = order
    .filter((path) => errors[path])
    .map((path) => ({ fieldId: idOf(path), label: labelOf[path], message: messageFor(path)! }));

  React.useEffect(() => {
    if (receipt) successRef.current?.focus();
  }, [receipt]);
  // The failure notice takes focus once it is in the page (not on a timer: that raced with rendering).
  React.useEffect(() => {
    if (failure) failureRef.current?.focus();
  }, [failure]);
  React.useEffect(() => {
    if (summary.length > 0) summaryRef.current?.focus();
    // Only when a new set of errors arrives, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set(SPAM_FIELDS.startedAt, String(startedAt.current));
    setFailure(null);
    const checked = schema.safeParse(readMembershipForm(data));
    if (!checked.success) {
      setErrors(fieldErrorsFrom(checked.error.issues));
      return;
    }
    setErrors({});
    startSending(async () => {
      const result = await submitMembership(data).catch(() => null);
      if (result?.ok) {
        setReceipt(result.data);
        return;
      }
      if (result && !result.ok && result.error === 'validation') {
        setErrors(result.fieldErrors);
        return;
      }
      const reason: MembershipFailure =
        result && !result.ok && result.error === 'conflict' && result.message
          ? (result.message as MembershipFailure)
          : 'unexpected';
      setFailure(reason);
    });
  }

  if (receipt) {
    const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
    return (
      <div ref={successRef} tabIndex={-1} className="outline-none">
        <FormSuccess
          title={t('success.title', { name: receipt.firstName })}
          nextTitle={t('success.next')}
          steps={[
            t('success.step1'),
            meeting
              ? t.rich('success.step2', { when: meeting.sentence, strong })
              : t('success.step2NoMeeting'),
            t('success.step3'),
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-5">
              {meeting && (
                <AddToCalendar
                  links={{ google: meeting.google, ics: meeting.ics }}
                  variant="secondary"
                  label={tCalendar('addMeeting')}
                />
              )}
              <Link href="/journey" className="font-medium text-brand-dark">
                {t('success.journey')}
              </Link>
            </div>
          }
        >
          <p className="text-[17px] leading-[1.6]">
            {t.rich('success.text', { email: receipt.email, strong })}
          </p>
        </FormSuccess>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h3 id={idOf('title')} className="text-[22px] leading-[1.3] font-bold lg:text-[26px]">
          {t('title')}
        </h3>
        <p className="text-small text-muted-ink lg:text-body">
          {t.rich('required', { req: (chunks) => <span className="text-brand-dark">{chunks}</span> })}
        </p>
      </div>
      <form
        noValidate
        onSubmit={onSubmit}
        aria-labelledby={idOf('title')}
        className="flex flex-col gap-5.5"
        aria-busy={sending || undefined}
      >
        <input type="hidden" name="locale" value={locale} />
        <Honeypot name={SPAM_FIELDS.honeypot} />

        <ErrorSummary
          ref={summaryRef}
          title={tUi('errorSummary', { count: summary.length })}
          errors={summary}
        />
        {failure && (
          <div ref={failureRef} tabIndex={-1} className="outline-none">
            <Notice tone="urgent" role="alert" icon={<CircleAlert className="size-[22px] text-brand" />}>
              {t(`failed.${failure}`)}
            </Notice>
          </div>
        )}

        <div className="grid gap-x-6 gap-y-5.5 sm:grid-cols-2">
          <FormField
            id={idOf('name')}
            label={t('name')}
            required
            error={messageFor('name')}
            className="sm:col-span-2"
          >
            {(control) => (
              <Input
                {...control}
                name={MEMBERSHIP_FIELDS.name}
                type="text"
                autoComplete="name"
                placeholder={t('namePlaceholder')}
                maxLength={MEMBERSHIP_LIMITS.name}
              />
            )}
          </FormField>
          <FormField id={idOf('email')} label={t('email')} required error={messageFor('email')}>
            {(control) => (
              <Input
                {...control}
                name={MEMBERSHIP_FIELDS.email}
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="name@example.com"
                maxLength={MEMBERSHIP_LIMITS.email}
              />
            )}
          </FormField>
          <FormField id={idOf('phone')} label={t('phone')} error={messageFor('phone')}>
            {(control) => (
              <Input
                {...control}
                name={MEMBERSHIP_FIELDS.phone}
                type="tel"
                autoComplete="tel"
                placeholder="07X XXX XXX"
                maxLength={MEMBERSHIP_LIMITS.phone}
              />
            )}
          </FormField>
          <FormField id={idOf('faculty')} label={t('faculty')} required error={messageFor('faculty')}>
            {(control) => (
              <NativeSelect {...control} name={MEMBERSHIP_FIELDS.faculty} defaultValue="">
                <NativeSelectOption value="">{t('choose')}</NativeSelectOption>
                {apply.faculties.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField id={idOf('program')} label={t('program')} required error={messageFor('program')}>
            {(control) => (
              <Input
                {...control}
                name={MEMBERSHIP_FIELDS.program}
                type="text"
                placeholder={t('programPlaceholder')}
                maxLength={MEMBERSHIP_LIMITS.program}
              />
            )}
          </FormField>
          <div className="sm:col-span-2">
            <SegmentedChoice
              name={MEMBERSHIP_FIELDS.year}
              id={idOf('year')}
              legend={t('year')}
              type="radio"
              required
              options={YEARS_OF_STUDY.map((year) => ({ value: year, label: t(`years.${year}`) }))}
              error={messageFor('year')}
            />
          </div>
          {apply.interests.length > 0 && (
            <div className="sm:col-span-2">
              <SegmentedChoice
                name={MEMBERSHIP_FIELDS.interests}
                id={idOf('interests')}
                legend={t('interests')}
                hint={t('pickAny')}
                type="checkbox"
                options={apply.interests.map((option) => ({ value: option.value, label: option.label }))}
                value={interests}
                onChange={setInterests}
                help={t('interestsHelp')}
                error={messageFor('interests')}
              />
            </div>
          )}
          {apply.heardFrom.length > 0 && (
            <FormField id={idOf('heardFrom')} label={t('heardFrom')} error={messageFor('heardFrom')}>
              {(control) => (
                <NativeSelect {...control} name={MEMBERSHIP_FIELDS.heardFrom} defaultValue="">
                  <NativeSelectOption value="">{t('choose')}</NativeSelectOption>
                  {apply.heardFrom.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            </FormField>
          )}

          <ConsentField
            id={idOf('consent')}
            name={MEMBERSHIP_FIELDS.consent}
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
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <SubmitButton sending={sending} className="max-sm:w-full">
            {t('submit')}
          </SubmitButton>
          <span className="text-small text-muted-ink">{t('afterSubmit')}</span>
        </div>
      </form>
    </div>
  );
}
