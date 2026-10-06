'use client';

import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { type FieldErrors, fieldErrorsFrom } from '@/shared/forms/action-result';
import { SPAM_FIELDS } from '@/shared/forms/spam-guard';
import { formatDate } from '@/shared/i18n/format';
import { Link, useRouter } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';
import { Checkbox, ChoiceLabel } from '@/shared/ui/form/choice';
import { ConsentField } from '@/shared/ui/form/consent-field';
import { ErrorSummary, type FieldErrorItem } from '@/shared/ui/form/error-summary';
import { FileDropzone } from '@/shared/ui/form/file-dropzone';
import { FormField } from '@/shared/ui/form/form-field';
import { FormSuccess } from '@/shared/ui/form/form-success';
import { SegmentedChoice } from '@/shared/ui/form/segmented-choice';
import { Honeypot, SubmitButton } from '@/shared/ui/form/submit-button';
import { Notice } from '@/shared/ui/notice';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';
import { Textarea } from '@/shared/ui/primitives/textarea';

import { type ApplicationReceipt, submitApplication } from '../actions/submit-application';
import {
  buildApplicationSchema,
  EMAIL_MAX,
  FORM_FIELDS,
  maxLengthOf,
  NAME_MAX,
  readApplicationForm,
} from '../domain/application-schema';
import type { PublicApplicationField, PublicApplicationForm } from '../types';
import { AddToCalendar, type CalendarLinks } from './add-to-calendar';

type ApplicationFormProps = {
  eventSlug: string;
  eventTitle: string;
  form: PublicApplicationForm;
  /** Every place is taken: the application joins the waitlist. */
  waitlist: boolean;
  /** "Sun 18 Oct 2026, 23:59", or null without a deadline. */
  deadline: string | null;
  /** "25 Oct 2026": "The organizing team will let you know by…". */
  resultsBy: string | null;
  siteName: string;
  /** For "already applied" (the event's questions e-mail). */
  contactEmail: string;
  calendar: CalendarLinks;
};

type Failure = 'closed' | 'full' | 'duplicate' | 'spam' | 'tooFast' | 'notFound' | 'unexpected';

/**
 * The application form of an upcoming event (UpcomingDetail › Apply), built from the event's form
 * definition. Validates in the browser with the same schema as the server, shows the error
 * summary and focuses it, then replaces itself with the confirmation (UpcomingStates).
 */
export function ApplicationForm({
  eventSlug,
  eventTitle,
  form,
  waitlist,
  deadline,
  resultsBy,
  siteName,
  contactEmail,
  calendar,
}: ApplicationFormProps) {
  const t = useTranslations('applications.form');
  const tUi = useTranslations('ui.form');
  const tCalendar = useTranslations('applications.calendar');
  const locale = useLocale();
  const router = useRouter();
  const [sending, startSending] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [failure, setFailure] = React.useState<Failure | null>(null);
  const [receipt, setReceipt] = React.useState<ApplicationReceipt | null>(null);
  const startedAt = React.useRef(0);
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const failureRef = React.useRef<HTMLDivElement>(null);
  const successRef = React.useRef<HTMLDivElement>(null);
  const schema = React.useMemo(() => buildApplicationSchema(form.fields), [form.fields]);

  // Spam guard: the time the form was shown (people need a few seconds to fill it in).
  React.useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // Ids carry the event: Next keeps a previous page mounted (hidden) for back / forward.
  const idOf = (path: string) =>
    `${eventSlug}-${path.startsWith('answers.') ? FORM_FIELDS.answer(path.slice(8)) : `apply-${path}`}`;
  const fieldByKey = new Map(form.fields.map((field) => [field.key, field]));

  const messageFor = (path: string) => {
    const key = errors[path]?.[0];
    if (!key) return undefined;
    const field = path.startsWith('answers.') ? fieldByKey.get(path.slice(8)) : undefined;
    const max = field ? maxLengthOf(field) : path === 'email' ? EMAIL_MAX : NAME_MAX;
    return t(`errors.${key}` as 'errors.required', { max });
  };

  const labelFor = (path: string) =>
    path === 'name'
      ? t('name')
      : path === 'email'
        ? t('email')
        : path === 'consent'
          ? t('consentLabel')
          : (fieldByKey.get(path.slice(8))?.label ?? path);

  const order = ['name', 'email', ...form.fields.map((field) => `answers.${field.key}`), 'consent'];
  const summary: FieldErrorItem[] = order
    .filter((path) => errors[path])
    .map((path) => ({
      fieldId: idOf(path),
      message: t('errorItem', { label: labelFor(path), error: messageFor(path)! }),
    }));

  React.useEffect(() => {
    if (receipt) successRef.current?.focus();
  }, [receipt]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set(SPAM_FIELDS.startedAt, String(startedAt.current));
    setFailure(null);
    const checked = schema.safeParse(readApplicationForm(data, form.fields));
    if (!checked.success) {
      setErrors(fieldErrorsFrom(checked.error.issues));
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setErrors({});
    startSending(async () => {
      const result = await submitApplication(data).catch(() => null);
      if (result?.ok) {
        setReceipt(result.data);
        // Places changed: the box, the cards and the sticky bar catch up.
        router.refresh();
        return;
      }
      if (result && !result.ok && result.error === 'validation') {
        setErrors(result.fieldErrors);
        requestAnimationFrame(() => summaryRef.current?.focus());
        return;
      }
      const reason: Failure =
        result && !result.ok && result.error === 'conflict' && result.message
          ? (result.message as Failure)
          : result && !result.ok && result.error === 'not_found'
            ? 'notFound'
            : 'unexpected';
      setFailure(reason);
      if (reason === 'closed' || reason === 'full' || reason === 'notFound') router.refresh();
      requestAnimationFrame(() => failureRef.current?.focus());
    });
  }

  if (receipt) {
    const onWaitlist = receipt.status === 'waitlist';
    const accepted = receipt.status === 'accepted';
    const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
    return (
      <div ref={successRef} tabIndex={-1} className="outline-none">
        <FormSuccess
          title={
            onWaitlist
              ? t('success.titleWaitlist')
              : accepted
                ? t('success.titleAccepted')
                : t('success.title')
          }
          detailsLayout="columns"
          details={[
            { label: t('success.event'), value: eventTitle },
            { label: t('success.submitted'), value: formatDate(receipt.submittedAt, locale, 'dateTime') },
            { label: t('success.reference'), value: receipt.reference },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-5">
              <AddToCalendar links={calendar} variant="secondary" label={tCalendar('addEvent')} />
              <Link href="/upcoming" className="font-medium text-brand-dark">
                {t('success.back')}
              </Link>
            </div>
          }
        >
          <p className="text-[17px] leading-[1.6]">
            {onWaitlist
              ? t.rich('success.waitlistText', {
                  name: receipt.firstName,
                  email: receipt.email,
                  position: receipt.waitlistPosition ?? 1,
                  strong,
                })
              : accepted
                ? t.rich('success.acceptedText', { name: receipt.firstName, email: receipt.email, strong })
                : t.rich('success.text', { name: receipt.firstName, email: receipt.email, strong })}
            {receipt.status === 'pending' && resultsBy && (
              <> {t.rich('success.results', { date: resultsBy, strong })}</>
            )}
          </p>
        </FormSuccess>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 lg:gap-2">
        <h2 id={`${eventSlug}-apply-title`} className="text-[22px] leading-[1.3] font-bold lg:text-[28px]">
          {waitlist ? t('titleWaitlist') : t('title')}
        </h2>
        <p className="text-small text-muted-ink lg:text-body">
          {[form.intro, deadline ? t('deadline', { date: deadline }) : null].filter(Boolean).join(' ')}{' '}
          {t.rich('required', { req: (chunks) => <span className="text-brand-dark">{chunks}</span> })}
        </p>
      </div>
      <form
        noValidate
        onSubmit={onSubmit}
        aria-labelledby={`${eventSlug}-apply-title`}
        className="flex flex-col gap-6"
        aria-busy={sending || undefined}
      >
        <input type="hidden" name="event" value={eventSlug} />
        <input type="hidden" name="locale" value={locale} />
        <Honeypot name={SPAM_FIELDS.honeypot} />

        <ErrorSummary
          ref={summaryRef}
          title={tUi('errorSummary', { count: summary.length })}
          errors={summary}
        />
        {failure && (
          <div ref={failureRef} tabIndex={-1} className="outline-none">
            <Notice tone="urgent" role="alert">
              {t(`failed.${failure}`, { email: contactEmail })}
            </Notice>
          </div>
        )}
        {waitlist && <Notice>{t('waitlistIntro')}</Notice>}

        <div className="grid gap-x-6 gap-y-5.5 sm:grid-cols-2">
          <FormField id={idOf('name')} label={t('name')} required error={messageFor('name')}>
            {(control) => (
              <Input
                {...control}
                name={FORM_FIELDS.name}
                type="text"
                autoComplete="name"
                maxLength={NAME_MAX}
              />
            )}
          </FormField>
          <FormField id={idOf('email')} label={t('email')} required error={messageFor('email')}>
            {(control) => (
              <Input
                {...control}
                name={FORM_FIELDS.email}
                type="email"
                autoComplete="email"
                inputMode="email"
                maxLength={EMAIL_MAX}
              />
            )}
          </FormField>

          {form.fields.map((field) => (
            <AnswerField
              key={field.key}
              field={field}
              id={idOf(`answers.${field.key}`)}
              error={messageFor(`answers.${field.key}`)}
            />
          ))}

          <ConsentField
            id={idOf('consent')}
            name={FORM_FIELDS.consent}
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
            {waitlist ? t('submitWaitlist') : t('submit')}
          </SubmitButton>
          <span className="text-small text-muted-ink">{t('afterSubmit')}</span>
        </div>
      </form>
    </div>
  );
}

/** One question of the event's form. */
function AnswerField({ field, id, error }: { field: PublicApplicationField; id: string; error?: string }) {
  const t = useTranslations('applications.form');
  const name = FORM_FIELDS.answer(field.key);
  const [length, setLength] = React.useState(0);
  const wide = field.type === 'long_text' || field.type === 'file' || field.type === 'checkbox';
  const className = cn(wide && 'sm:col-span-2');
  const max = maxLengthOf(field);
  const help = field.help || undefined;

  switch (field.type) {
    case 'text':
      return (
        <FormField
          id={id}
          label={field.label}
          required={field.required}
          help={help}
          error={error}
          className={className}
        >
          {(control) => (
            <Input
              {...control}
              name={name}
              type={field.format === 'phone' ? 'tel' : 'text'}
              autoComplete={field.format === 'phone' ? 'tel' : undefined}
              placeholder={field.placeholder || undefined}
              maxLength={max}
            />
          )}
        </FormField>
      );
    case 'long_text':
      return (
        <FormField
          id={id}
          label={field.label}
          required={field.required}
          help={[help, t('maxChars', { max: max.toLocaleString('en-US') })].filter(Boolean).join(' ')}
          counter={t('counter', { count: length.toLocaleString('en-US'), max: max.toLocaleString('en-US') })}
          error={error}
          className={className}
        >
          {(control) => (
            <Textarea
              {...control}
              name={name}
              placeholder={field.placeholder || undefined}
              rows={5}
              onChange={(event) => setLength(event.target.value.length)}
            />
          )}
        </FormField>
      );
    case 'select':
      if (field.appearance === 'buttons')
        return (
          <div className={className}>
            <SegmentedChoice
              name={name}
              id={id}
              legend={field.label}
              type="radio"
              options={field.options ?? []}
              required={field.required}
              help={help}
              error={error}
            />
          </div>
        );
      return (
        <FormField
          id={id}
          label={field.label}
          required={field.required}
          help={help}
          error={error}
          className={className}
        >
          {(control) => (
            <NativeSelect
              {...control}
              name={name}
              defaultValue={field.required ? '' : field.options?.[0]?.value}
            >
              {field.required && <NativeSelectOption value="">{t('choose')}</NativeSelectOption>}
              {field.options?.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
      );
    case 'checkbox':
      return (
        <div className={className}>
          <ChoiceLabel control={<Checkbox id={id} name={name} aria-invalid={error ? true : undefined} />}>
            {field.label}
            {field.required && (
              <span className="text-brand-dark" aria-hidden>
                {' '}
                *
              </span>
            )}
          </ChoiceLabel>
          {error && <span className="mt-1.5 block text-small font-medium text-brand-dark">{error}</span>}
        </div>
      );
    case 'file':
      return (
        <div className={className}>
          <FileDropzone
            id={id}
            name={name}
            label={field.label}
            accept="application/pdf"
            help={help}
            error={error}
          />
        </div>
      );
  }
}
