'use client';

import { CircleAlert, Download } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

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
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { Textarea } from '@/shared/ui/primitives/textarea';

import { type InquiryReceipt, submitInquiry } from '../../actions/submit-inquiry';
import {
  INQUIRY_FIELDS,
  INQUIRY_LIMITS,
  type InquiryFailure,
  inquirySchema,
  readInquiryForm,
} from '../../domain/inquiry';
import { INQUIRY_INTERESTS } from '../../types';

type CompanyFormProps = {
  siteName: string;
  /** Where people can write instead ("Prefer e-mail?"). */
  email: string;
  /** The offer PDF for the confirmation; null when the library has no file for it. */
  offerUrl: string | null;
};

const ID = 'inquiry';
const idOf = (path: string) => `${ID}-${path}`;

/**
 * The partnership inquiry form (CompanyForm › all states): checked in the browser with the same
 * schema as the server, an error summary that takes focus, "Sending…", then the confirmation.
 */
export function CompanyForm({ siteName, email, offerUrl }: CompanyFormProps) {
  const t = useTranslations('partners.form');
  const tUi = useTranslations('ui.form');
  const locale = useLocale();
  const [sending, startSending] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [failure, setFailure] = React.useState<InquiryFailure | null>(null);
  const [receipt, setReceipt] = React.useState<InquiryReceipt | null>(null);
  const [interests, setInterests] = React.useState<string[]>([]);
  const [length, setLength] = React.useState(0);
  const startedAt = React.useRef(0);
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const failureRef = React.useRef<HTMLDivElement>(null);
  const successRef = React.useRef<HTMLDivElement>(null);

  // Spam guard: the time the form was shown (people need a few seconds to fill it in).
  React.useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const messageFor = (path: string) => {
    const key = errors[path]?.[0];
    if (!key) return undefined;
    const known = ['required', 'tooLong', 'tooShort', 'email', 'phone', 'interests', 'consent', 'invalid'];
    return t(`errors.${known.includes(key) ? key : 'invalid'}` as 'errors.required', {
      max: INQUIRY_LIMITS.message.toLocaleString('en-US'),
      min: INQUIRY_LIMITS.minMessage,
    });
  };

  const order = ['company', 'person', 'email', 'phone', 'interests', 'message', 'consent'] as const;
  const labelOf = {
    company: t('company'),
    person: t('person'),
    email: t('email'),
    phone: t('phone'),
    interests: t('interestsShort'),
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
    const checked = inquirySchema.safeParse(readInquiryForm(data));
    if (!checked.success) {
      setErrors(fieldErrorsFrom(checked.error.issues));
      return;
    }
    setErrors({});
    startSending(async () => {
      const result = await submitInquiry(data).catch(() => null);
      if (result?.ok) {
        setReceipt(result.data);
        return;
      }
      if (result && !result.ok && result.error === 'validation') {
        setErrors(result.fieldErrors);
        return;
      }
      setFailure(
        result && !result.ok && result.error === 'conflict' && result.message
          ? (result.message as InquiryFailure)
          : 'unexpected',
      );
    });
  }

  if (receipt) {
    const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
    return (
      <div ref={successRef} tabIndex={-1} className="outline-none">
        <FormSuccess
          title={t('success.title', { name: receipt.firstName })}
          details={[
            { label: t('success.company'), value: receipt.company },
            {
              label: t('success.interested'),
              value: receipt.interests.map((interest) => t(`interests.${interest}`)).join(', '),
            },
            { label: t('success.reference'), value: receipt.reference },
          ]}
          detailsLayout="columns"
          actions={
            <>
              {offerUrl && (
                <Button asChild variant="secondary">
                  <a href={offerUrl} download>
                    <Download aria-hidden />
                    {t('success.offer')}
                  </a>
                </Button>
              )}
              <Link href="/events" className="inline-flex h-12 items-center font-medium text-brand-dark">
                {t('success.events')} →
              </Link>
            </>
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
    <div className="flex flex-col gap-5.5">
      <div className="flex flex-col gap-1.5">
        <h3 id={idOf('title')} className="text-[22px] leading-[1.3] font-bold lg:text-[24px]">
          {t('title')}
        </h3>
        <p className="text-small text-muted-ink">
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
          <FormField id={idOf('company')} label={t('company')} required error={messageFor('company')}>
            {(control) => (
              <Input
                {...control}
                name={INQUIRY_FIELDS.company}
                type="text"
                autoComplete="organization"
                placeholder={t('companyPlaceholder')}
                maxLength={INQUIRY_LIMITS.company}
              />
            )}
          </FormField>
          <FormField id={idOf('person')} label={t('person')} required error={messageFor('person')}>
            {(control) => (
              <Input
                {...control}
                name={INQUIRY_FIELDS.person}
                type="text"
                autoComplete="name"
                placeholder={t('personPlaceholder')}
                maxLength={INQUIRY_LIMITS.person}
              />
            )}
          </FormField>
          <FormField id={idOf('email')} label={t('email')} required error={messageFor('email')}>
            {(control) => (
              <Input
                {...control}
                name={INQUIRY_FIELDS.email}
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="name@company.com"
                maxLength={INQUIRY_LIMITS.email}
              />
            )}
          </FormField>
          <FormField id={idOf('phone')} label={t('phone')} error={messageFor('phone')}>
            {(control) => (
              <Input
                {...control}
                name={INQUIRY_FIELDS.phone}
                type="tel"
                autoComplete="tel"
                placeholder="+389 2 …"
                maxLength={INQUIRY_LIMITS.phone}
              />
            )}
          </FormField>
          <div className="sm:col-span-2">
            <SegmentedChoice
              name={INQUIRY_FIELDS.interests}
              id={idOf('interests')}
              legend={t('interestsLegend')}
              hint={t('pickAny')}
              type="checkbox"
              required
              options={INQUIRY_INTERESTS.map((interest) => ({
                value: interest,
                label: t(`interests.${interest}`),
              }))}
              value={interests}
              onChange={setInterests}
              error={messageFor('interests')}
            />
          </div>
          <FormField
            id={idOf('message')}
            label={t('message')}
            required
            help={t('maxChars', { max: INQUIRY_LIMITS.message.toLocaleString('en-US') })}
            counter={t('counter', {
              count: length.toLocaleString('en-US'),
              max: INQUIRY_LIMITS.message.toLocaleString('en-US'),
            })}
            error={messageFor('message')}
            className="sm:col-span-2"
          >
            {(control) => (
              <Textarea
                {...control}
                name={INQUIRY_FIELDS.message}
                rows={5}
                placeholder={t('messagePlaceholder')}
                onChange={(event) => setLength(event.target.value.length)}
              />
            )}
          </FormField>
          <ConsentField
            id={idOf('consent')}
            name={INQUIRY_FIELDS.consent}
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
          <span className="text-small text-muted-ink">
            {t.rich('preferEmail', {
              email,
              mail: (chunks) => (
                <a href={`mailto:${email}`} className="font-medium text-brand-dark">
                  {chunks}
                </a>
              ),
            })}
          </span>
        </div>
      </form>
    </div>
  );
}
