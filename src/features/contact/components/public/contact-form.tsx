'use client';

import { CircleAlert, Send } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { type FieldErrors, fieldErrorsFrom } from '@/shared/forms/action-result';
import { SPAM_FIELDS } from '@/shared/forms/spam-guard';
import { formatDate } from '@/shared/i18n/format';
import { Link } from '@/shared/i18n/navigation';
import { ActionLink } from '@/shared/ui/action-link';
import { ConsentField } from '@/shared/ui/form/consent-field';
import { ErrorSummary, type FieldErrorItem } from '@/shared/ui/form/error-summary';
import { FormField } from '@/shared/ui/form/form-field';
import { FormSuccess } from '@/shared/ui/form/form-success';
import { SpamCheckRow } from '@/shared/ui/form/spam-check-row';
import { Honeypot, SubmitButton } from '@/shared/ui/form/submit-button';
import { Notice } from '@/shared/ui/notice';
import { buttonVariants } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';
import { Textarea } from '@/shared/ui/primitives/textarea';

import { type MessageReceipt, submitMessage } from '../../actions/submit-message';
import {
  buildContactSchema,
  MESSAGE_FIELDS,
  MESSAGE_LIMITS,
  type MessageFailure,
  readContactForm,
} from '../../domain/message';
import type { PublicContact } from '../../types';

type ContactFormProps = {
  form: PublicContact['form'];
  subjects: PublicContact['subjects'];
  siteName: string;
  /** Where people can write if sending fails. */
  email: string;
};

const ID = 'ct';
const idOf = (path: string) => `${ID}-${path}`;
const ROUTE_NOTE_ID = idOf('route');
/** The form's honeypot and timing guard want people to take a few seconds (shared/forms/spam-guard). */
const SPAM_CHECK_MS = 3000;

/**
 * The contact form (ContactForm › all states): the subject decides who receives the message and may
 * suggest a faster page; checked in the browser with the same schema as the server, an error summary
 * that takes focus, "Sending…", then the confirmation.
 */
export function ContactForm({ form, subjects, siteName, email }: ContactFormProps) {
  const t = useTranslations('contact.form');
  const tUi = useTranslations('ui.form');
  const locale = useLocale();
  const [sending, startSending] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [failure, setFailure] = React.useState<MessageFailure | null>(null);
  const [receipt, setReceipt] = React.useState<MessageReceipt | null>(null);
  const [subject, setSubject] = React.useState('');
  const [length, setLength] = React.useState(0);
  const [checked, setChecked] = React.useState(false);
  const startedAt = React.useRef(0);
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const failureRef = React.useRef<HTMLDivElement>(null);
  const successRef = React.useRef<HTMLDivElement>(null);

  const schema = React.useMemo(() => buildContactSchema(subjects.map((item) => item.id)), [subjects]);
  const chosen = subjects.find((item) => item.id === subject);
  const suggestion = chosen?.suggestion ?? null;

  // Spam guard: the time the form was shown (people need a few seconds to fill it in). The row says
  // "passed" once that time is over, which is what the server checks.
  React.useEffect(() => {
    startedAt.current = Date.now();
    const timer = window.setTimeout(() => setChecked(true), SPAM_CHECK_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const messageFor = (path: string) => {
    const key = errors[path]?.[0];
    if (!key) return undefined;
    const known = ['name', 'email', 'subject', 'message', 'tooLong', 'consent', 'invalid'];
    return t(`errors.${known.includes(key) ? key : 'invalid'}` as 'errors.name');
  };

  const order = ['name', 'email', 'subject', 'message', 'consent'] as const;
  const labelOf = {
    name: t('name'),
    email: t('email'),
    subject: t('subject'),
    message: t('message'),
    consent: t('consentShort'),
  } as const;
  const summary: FieldErrorItem[] = order
    .filter((path) => errors[path])
    .map((path) => ({ fieldId: idOf(path), label: labelOf[path], message: messageFor(path)! }));

  React.useEffect(() => {
    if (receipt) successRef.current?.focus();
  }, [receipt]);
  React.useEffect(() => {
    if (Object.keys(errors).length > 0) summaryRef.current?.focus();
  }, [errors]);
  React.useEffect(() => {
    if (failure) failureRef.current?.focus();
  }, [failure]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set(SPAM_FIELDS.startedAt, String(startedAt.current));
    setFailure(null);
    const result = schema.safeParse(readContactForm(data));
    if (!result.success) {
      setErrors(fieldErrorsFrom(result.error.issues));
      return;
    }
    setErrors({});
    startSending(async () => {
      const response = await submitMessage(data).catch(() => null);
      if (response?.ok) {
        setReceipt(response.data);
        return;
      }
      if (response && !response.ok && response.error === 'validation') {
        setErrors(response.fieldErrors);
        return;
      }
      setFailure(
        response && !response.ok && response.error === 'conflict' && response.message
          ? (response.message as MessageFailure)
          : 'unexpected',
      );
    });
  }

  const card =
    'rounded-lg border border-line bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_6px_20px_rgb(0_0_0/0.06)] lg:p-9';

  if (receipt) {
    const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
    const next = subjects.find((item) => item.id === receipt.subjectId)?.suggestion ?? null;
    return (
      <div ref={successRef} tabIndex={-1} className={`${card} outline-none`}>
        <FormSuccess
          title={t('success.title', { name: receipt.firstName })}
          details={[
            { label: t('success.subject'), value: receipt.subject },
            { label: t('success.sent'), value: formatDate(receipt.sentAt, locale, 'dateTime') },
            { label: t('success.reference'), value: receipt.reference },
          ]}
          detailsLayout="columns"
          actions={
            <>
              {next && (
                <ActionLink href={next.href} className={buttonVariants({ variant: 'secondary' })}>
                  {next.label}
                </ActionLink>
              )}
              <button
                type="button"
                onClick={() => {
                  setReceipt(null);
                  setSubject('');
                  setLength(0);
                  startedAt.current = Date.now();
                }}
                className="inline-flex h-12 cursor-pointer items-center font-medium text-brand-dark hover:underline"
              >
                {t('success.another')}
              </button>
            </>
          }
        >
          <p className="text-[17px] leading-[1.6]">
            {t.rich('success.text', { team: receipt.team, email: receipt.email, strong })}
          </p>
        </FormSuccess>
      </div>
    );
  }

  return (
    <div className={`${card} flex flex-col gap-5.5`}>
      <div className="flex flex-col gap-1.5">
        <h2 id={idOf('title')} className="text-[22px] leading-[1.3] font-bold lg:text-[24px]">
          {form.title}
        </h2>
        <p className="text-small text-muted-ink">
          {form.intro && `${form.intro} `}
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
              {t(`failed.${failure}`, { email })}
            </Notice>
          </div>
        )}

        <div className="grid gap-x-5 gap-y-5.5 sm:grid-cols-2">
          <FormField id={idOf('name')} label={t('name')} required error={messageFor('name')}>
            {(control) => (
              <Input
                {...control}
                name={MESSAGE_FIELDS.name}
                type="text"
                autoComplete="name"
                placeholder={t('namePlaceholder')}
                maxLength={MESSAGE_LIMITS.name}
              />
            )}
          </FormField>
          <FormField id={idOf('email')} label={t('email')} required error={messageFor('email')}>
            {(control) => (
              <Input
                {...control}
                name={MESSAGE_FIELDS.email}
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="name@example.com"
                maxLength={MESSAGE_LIMITS.email}
              />
            )}
          </FormField>
          <div className="flex flex-col gap-2.5 sm:col-span-2">
            <FormField id={idOf('subject')} label={t('subject')} required error={messageFor('subject')}>
              {(control) => (
                <NativeSelect
                  {...control}
                  aria-describedby={
                    [control['aria-describedby'], suggestion && ROUTE_NOTE_ID].filter(Boolean).join(' ') ||
                    undefined
                  }
                  name={MESSAGE_FIELDS.subject}
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                >
                  <NativeSelectOption value="">{t('choose')}</NativeSelectOption>
                  {subjects.map((item) => (
                    <NativeSelectOption key={item.id} value={item.id}>
                      {item.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            {suggestion && (
              <p
                id={ROUTE_NOTE_ID}
                role="note"
                className="rounded-sm bg-surface px-3.5 py-3 text-small text-ink-2"
              >
                {suggestion.note}
                {suggestion.href && suggestion.label && (
                  <>
                    {' '}
                    <ActionLink href={suggestion.href} className="font-medium text-brand-dark underline">
                      {suggestion.label}
                    </ActionLink>
                  </>
                )}
              </p>
            )}
          </div>
          <FormField
            id={idOf('message')}
            label={t('message')}
            required
            help={t('maxChars', { max: MESSAGE_LIMITS.message.toLocaleString('en-US') })}
            counter={t('counter', {
              count: length.toLocaleString('en-US'),
              max: MESSAGE_LIMITS.message.toLocaleString('en-US'),
            })}
            error={messageFor('message')}
            className="sm:col-span-2"
          >
            {(control) => (
              <Textarea
                {...control}
                name={MESSAGE_FIELDS.message}
                rows={6}
                placeholder={t('messagePlaceholder')}
                onChange={(event) => setLength(event.target.value.length)}
              />
            )}
          </FormField>
          <div className="sm:col-span-2">
            <SpamCheckRow passed={checked} />
          </div>
          <ConsentField
            id={idOf('consent')}
            name={MESSAGE_FIELDS.consent}
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

        <div>
          <SubmitButton sending={sending} className="max-sm:w-full">
            <Send aria-hidden />
            {t('submit')}
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
