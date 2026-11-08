'use client';

import { CircleAlert, ImagePlus, Send, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { RATE_LIMIT } from '@/shared/data/rate-limit/rate-limit';
import { type FieldErrors, fieldErrorsFrom } from '@/shared/forms/action-result';
import { photoProblem, preparePhoto } from '@/shared/forms/photo-compress';
import { SPAM_FIELDS } from '@/shared/forms/spam-guard';
import { formatDate } from '@/shared/i18n/format';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';
import { ActionLink } from '@/shared/ui/action-link';
import { Checkbox } from '@/shared/ui/form/choice';
import { ConsentField } from '@/shared/ui/form/consent-field';
import { ErrorSummary, type FieldErrorItem } from '@/shared/ui/form/error-summary';
import { FileDropzone } from '@/shared/ui/form/file-dropzone';
import { FormField } from '@/shared/ui/form/form-field';
import { FormSuccess } from '@/shared/ui/form/form-success';
import { SegmentedChoice } from '@/shared/ui/form/segmented-choice';
import { StarRating } from '@/shared/ui/form/star-rating';
import { Honeypot, SubmitButton } from '@/shared/ui/form/submit-button';
import { Notice } from '@/shared/ui/notice';
import { buttonVariants } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';
import { Textarea } from '@/shared/ui/primitives/textarea';

import { submitIdea, submitImpression } from '../../actions/submit';
import {
  IDEA_LIMITS,
  OTHER_EVENT,
  readIdeaForm,
  readImpressionForm,
  SUBMIT_FIELDS,
  type SubmitReceipt,
} from '../../domain/submission-fields';

// The schemas (and zod with them, about 90 KB) are fetched when a form is first used, not with the page.
const loadSchema = () => import('../../domain/submission');

export type SubmitTab = 'idea' | 'impression';

export type SubmitFormProps = {
  tab: SubmitTab;
  /** The line under the title (Admin › Ideas › Form settings), in the language of the page. */
  intro: string;
  types: { id: string; name: string }[];
  /** Listed events that have started, newest first: "Title · Month Year". */
  events: { id: string; label: string }[];
  /** The event of the link the visitor came by (`?event=<slug>`), when it is one of the events. */
  presetEvent: string | null;
  /** Someone signed in: no name and e-mail to ask, no consent box. */
  member: { name: string; email: string; initials: string; canWriteMemory: boolean } | null;
  siteName: string;
  /** Where people can write if sending fails. */
  email: string;
  /** How long a name and e-mail are kept (Settings › retention). */
  months: number;
  /** "Wednesday", "18:00": the weekly meeting where the board reads the ideas; null when it is hidden. */
  meeting: { day: string; time: string } | null;
};

type Photo = { id: string; file: File; url: string };

const ID = 'sf';
const idOf = (path: string) => `${ID}-${path}`;
const KNOWN_ERRORS = [
  'type',
  'title',
  'tooLong',
  'description',
  'attachmentType',
  'attachmentSize',
  'event',
  'otherEvent',
  'impression',
  'photoCount',
  'photoType',
  'photoSize',
  'photoUnreadable',
  'email',
  'consent',
  'memoryTitle',
];

const FIELD_ORDER = {
  idea: ['type', 'title', 'description', 'attachment', 'email', 'consent'],
  impression: ['event', 'otherEvent', 'impression', 'photos', 'email', 'consent', 'memoryTitle'],
} as const;

/** The control an error summary link focuses. */
const FIELD_IDS: Record<string, string> = {
  type: idOf('type'),
  title: idOf('title'),
  description: idOf('desc'),
  attachment: idOf('attachment'),
  event: idOf('ev'),
  otherEvent: idOf('other'),
  impression: idOf('imp'),
  photos: idOf('photos-add'),
  email: idOf('email'),
  consent: idOf('consent'),
  memoryTitle: idOf('memory-title'),
};

/**
 * /submit, both tabs (SubmitForm › all states): an idea, or an impression of an event. Checked in
 * the browser with the same schema as the server, an error summary that takes focus, "Sending…",
 * the rate-limit notice that keeps the text, then the confirmation. Photos are made smaller in the
 * browser first.
 */
export function SubmitForm(props: SubmitFormProps) {
  const { tab, intro, types, events, presetEvent, member, siteName, email, months, meeting } = props;
  const t = useTranslations('ideas.submit');
  const tUi = useTranslations('ui.form');
  const locale = useLocale();
  const [sending, startSending] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [failed, setFailed] = React.useState(false);
  const [limitedUntil, setLimitedUntil] = React.useState<string | null>(null);
  const [receipt, setReceipt] = React.useState<SubmitReceipt | null>(null);
  const [anonymous, setAnonymous] = React.useState(false);
  const [typed, setTyped] = React.useState('');
  const [asMemory, setAsMemory] = React.useState(false);
  const [eventValue, setEventValue] = React.useState(presetEvent ?? '');
  const [titleLength, setTitleLength] = React.useState(0);
  const [textLength, setTextLength] = React.useState(0);
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const startedAt = React.useRef(0);
  const photoInput = React.useRef<HTMLInputElement>(null);
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const noticeRef = React.useRef<HTMLDivElement>(null);
  const successRef = React.useRef<HTMLDivElement>(null);

  const idea = tab === 'idea';
  const canMemory = !idea && member?.canWriteMemory === true && !anonymous;
  const memoryOn = canMemory && asMemory;
  const showAbout = member === null && !anonymous;
  const limited = limitedUntil !== null;

  React.useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  React.useEffect(() => {
    if (receipt) successRef.current?.focus();
  }, [receipt]);
  React.useEffect(() => {
    if (Object.keys(errors).length > 0) summaryRef.current?.focus();
  }, [errors]);
  React.useEffect(() => {
    if (failed || limited) noticeRef.current?.focus();
  }, [failed, limited]);
  // The button comes back when the hour is over, without a reload.
  React.useEffect(() => {
    if (!limitedUntil) return;
    const wait = Math.max(0, new Date(limitedUntil).getTime() - Date.now());
    const timer = window.setTimeout(() => setLimitedUntil(null), Math.min(wait, 2 ** 31 - 1));
    return () => window.clearTimeout(timer);
  }, [limitedUntil]);
  // Object URLs of the photo tiles are given back when the form goes away.
  const photoUrls = React.useRef<string[]>([]);
  React.useEffect(
    () => () => {
      for (const url of photoUrls.current) URL.revokeObjectURL(url);
    },
    [],
  );

  const messageFor = (path: string) => {
    const key = errors[path]?.[0];
    if (!key) return undefined;
    return t(`errors.${KNOWN_ERRORS.includes(key) ? key : 'invalid'}` as 'errors.invalid', {
      min: IDEA_LIMITS.descriptionMin,
    });
  };

  const summary: FieldErrorItem[] = FIELD_ORDER[tab]
    .filter((path) => errors[path])
    .map((path) => ({
      fieldId: FIELD_IDS[path] ?? idOf(path),
      label: t(`errors.field.${path}` as 'errors.field.type'),
      message: messageFor(path) ?? '',
    }));

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const next = [...photos];
    let problem: string | null = null;
    for (const file of files) {
      if (next.length >= IDEA_LIMITS.photos) {
        problem = 'photoCount';
        break;
      }
      const found = photoProblem(file);
      if (found) {
        problem = found === 'type' ? 'photoType' : 'photoSize';
        continue;
      }
      const url = URL.createObjectURL(file);
      photoUrls.current.push(url);
      next.push({ id: crypto.randomUUID(), file, url });
    }
    setPhotos(next);
    setErrors((current) => {
      const { photos: _removed, ...rest } = current;
      return problem ? { ...rest, photos: [problem] } : rest;
    });
    if (photoInput.current) photoInput.current.value = '';
  }

  function removePhoto(id: string) {
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set(SPAM_FIELDS.startedAt, String(startedAt.current));
    setFailed(false);
    const schemas = await loadSchema();
    const result = idea
      ? schemas
          .buildIdeaSchema(
            types.map((type) => type.id),
            member !== null,
          )
          .safeParse(readIdeaForm(data))
      : schemas
          .buildImpressionSchema(
            events.map((item) => item.id),
            member !== null,
          )
          .safeParse({
            ...readImpressionForm(data),
            photos: photos.map(({ file }) => ({ name: file.name, size: file.size, type: file.type })),
          });
    if (!result.success) {
      setErrors(fieldErrorsFrom(result.error.issues));
      return;
    }
    setErrors({});
    startSending(async () => {
      if (!idea) {
        // Each photo becomes a JPEG of at most 2000 px before it travels.
        try {
          for (const { file } of photos) {
            const prepared = await preparePhoto(file);
            data.append(
              SUBMIT_FIELDS.photos,
              new File([prepared.blob], prepared.name, { type: 'image/jpeg' }),
            );
            data.append('photoWidths', String(prepared.width));
            data.append('photoHeights', String(prepared.height));
          }
        } catch {
          setErrors({ photos: ['photoUnreadable'] });
          return;
        }
      }
      const response = await (idea ? submitIdea(data) : submitImpression(data)).catch(() => null);
      if (response?.ok) {
        setReceipt(response.data);
        return;
      }
      if (response && !response.ok && response.error === 'validation') {
        setErrors(response.fieldErrors);
        return;
      }
      if (response && !response.ok && response.error === 'rate_limited') {
        setLimitedUntil(response.retryAt);
        return;
      }
      setFailed(true);
    });
  }

  const card =
    'rounded-lg border border-line bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_6px_20px_rgb(0_0_0/0.06)] lg:p-9';

  if (receipt) {
    return (
      <div ref={successRef} tabIndex={-1} className={`${card} outline-none`}>
        <Confirmation
          receipt={receipt}
          meeting={meeting}
          onAnother={() => {
            setReceipt(null);
            setAnonymous(false);
            setAsMemory(false);
            setTyped('');
            setPhotos([]);
            setEventValue(presetEvent ?? '');
            setTitleLength(0);
            setTextLength(0);
            startedAt.current = Date.now();
          }}
        />
      </div>
    );
  }

  const boxClass = (on: boolean) =>
    cn(
      'flex cursor-pointer items-start gap-3 rounded-md border-2 px-4 py-3.5',
      on ? 'border-brand bg-brand-tint' : 'border-line bg-white',
    );

  return (
    <div className={`${card} flex flex-col gap-5.5`}>
      <div className="flex flex-col gap-1.5">
        <h2 id={idOf('title-heading')} className="text-[22px] leading-[1.3] font-bold lg:text-[24px]">
          {idea ? t('ideaTitle') : t('impressionTitle')}
        </h2>
        <p className="text-small text-muted-ink">
          {intro && `${intro} `}
          {t.rich('required', { req: (chunks) => <span className="text-brand-dark">{chunks}</span> })}
        </p>
      </div>
      <form
        noValidate
        onSubmit={onSubmit}
        onFocus={() => void loadSchema()}
        aria-labelledby={idOf('title-heading')}
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
        {(limited || failed) && (
          <div ref={noticeRef} tabIndex={-1} className="outline-none">
            {limitedUntil ? (
              <Notice
                tone="urgent"
                role="alert"
                title={t('rateLimited.title')}
                icon={<CircleAlert className="size-[22px] text-brand" />}
              >
                {t('rateLimited.text', {
                  max: RATE_LIMIT.perHour,
                  time: formatDate(limitedUntil, locale === 'mk' ? 'mk' : 'en', 'time'),
                })}
              </Notice>
            ) : (
              <Notice tone="urgent" role="alert" icon={<CircleAlert className="size-[22px] text-brand" />}>
                {t('failed', { email })}
              </Notice>
            )}
          </div>
        )}

        {idea ? (
          <>
            <SegmentedChoice
              id={idOf('type')}
              name={SUBMIT_FIELDS.type}
              legend={t('idea.type')}
              type="radio"
              required
              options={types.map((type) => ({ value: type.id, label: type.name }))}
              {...(messageFor('type') ? { error: messageFor('type') } : {})}
            />
            <FormField
              id={idOf('title')}
              label={t('idea.title')}
              required
              counter={t('counter', { count: titleLength, max: IDEA_LIMITS.title })}
              error={messageFor('title')}
            >
              {(control) => (
                <Input
                  {...control}
                  name={SUBMIT_FIELDS.title}
                  maxLength={IDEA_LIMITS.title}
                  placeholder={t('idea.titlePlaceholder')}
                  onChange={(event) => setTitleLength(event.target.value.length)}
                />
              )}
            </FormField>
            <FormField
              id={idOf('desc')}
              label={t('idea.description')}
              required
              counter={t('counter', {
                count: textLength.toLocaleString('en-US'),
                max: IDEA_LIMITS.description.toLocaleString('en-US'),
              })}
              error={messageFor('description')}
            >
              {(control) => (
                <Textarea
                  {...control}
                  name={SUBMIT_FIELDS.description}
                  rows={6}
                  placeholder={t('idea.descriptionPlaceholder')}
                  onChange={(event) => setTextLength(event.target.value.length)}
                />
              )}
            </FormField>
            <FileDropzone
              id={idOf('attachment')}
              name={SUBMIT_FIELDS.attachment}
              label={t('idea.attachment')}
              accept="application/pdf,image/jpeg,image/png"
              help={t('idea.attachmentHelp')}
              optional
              {...(messageFor('attachment') ? { error: messageFor('attachment') } : {})}
            />
          </>
        ) : (
          <>
            <div className="grid gap-x-5 gap-y-5.5 sm:grid-cols-2">
              <FormField
                id={idOf('ev')}
                label={t('impression.event')}
                required
                help={presetEvent && eventValue === presetEvent ? t('impression.eventFromLink') : undefined}
                error={messageFor('event')}
                className={eventValue === OTHER_EVENT ? undefined : 'sm:col-span-2'}
              >
                {(control) => (
                  <NativeSelect
                    {...control}
                    name={SUBMIT_FIELDS.event}
                    value={eventValue}
                    onChange={(event) => setEventValue(event.target.value)}
                  >
                    <NativeSelectOption value="">{t('impression.eventChoose')}</NativeSelectOption>
                    {events.map((item) => (
                      <NativeSelectOption key={item.id} value={item.id}>
                        {item.label}
                      </NativeSelectOption>
                    ))}
                    <NativeSelectOption value={OTHER_EVENT}>{t('impression.eventOther')}</NativeSelectOption>
                  </NativeSelect>
                )}
              </FormField>
              {eventValue === OTHER_EVENT && (
                <FormField
                  id={idOf('other')}
                  label={t('impression.otherName')}
                  required
                  error={messageFor('otherEvent')}
                >
                  {(control) => (
                    <Input {...control} name={SUBMIT_FIELDS.otherEvent} maxLength={IDEA_LIMITS.otherEvent} />
                  )}
                </FormField>
              )}
            </div>
            <StarRating name={SUBMIT_FIELDS.rating} legend={t('impression.rating')} optional />
            <FormField
              id={idOf('imp')}
              label={t('impression.text')}
              required
              counter={t('counter', {
                count: textLength.toLocaleString('en-US'),
                max: IDEA_LIMITS.impression.toLocaleString('en-US'),
              })}
              error={messageFor('impression')}
            >
              {(control) => (
                <Textarea
                  {...control}
                  name={SUBMIT_FIELDS.impression}
                  rows={6}
                  maxLength={IDEA_LIMITS.impression}
                  placeholder={t('impression.textPlaceholder')}
                  onChange={(event) => setTextLength(event.target.value.length)}
                />
              )}
            </FormField>
            <div className="flex flex-col gap-2">
              <span className="text-small font-medium text-ink">
                {t('impression.photos')}
                <span className="font-normal text-muted-ink"> · {t('impression.photosHint')}</span>
              </span>
              <ul className="flex flex-wrap gap-3">
                {photos.map((photo) => (
                  <li
                    key={photo.id}
                    className="relative size-24 overflow-hidden rounded-md border border-line"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of a picked file */}
                    <img src={photo.url} alt="" className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      aria-label={t('impression.photoRemove', { name: photo.file.name })}
                      className="absolute top-1 right-1 flex size-7 cursor-pointer items-center justify-center rounded-full bg-ink text-white focus-visible:outline-3 focus-visible:outline-brand"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
                {photos.length < IDEA_LIMITS.photos && (
                  <li>
                    <button
                      type="button"
                      id={idOf('photos-add')}
                      onClick={() => photoInput.current?.click()}
                      className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-line-strong text-small font-medium text-ink-2 hover:border-brand focus-visible:outline-3 focus-visible:outline-brand"
                    >
                      <ImagePlus className="size-5" aria-hidden />
                      {t('impression.photosAdd')}
                    </button>
                  </li>
                )}
              </ul>
              <input
                ref={photoInput}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                data-testid="submit-photos"
                onChange={(event) => addPhotos(event.target.files)}
              />
              {messageFor('photos') ? (
                <p role="alert" className="flex items-center gap-1.5 text-small text-brand-dark">
                  <CircleAlert className="size-4 shrink-0" aria-hidden />
                  {messageFor('photos')}
                </p>
              ) : (
                <p className="text-small text-muted-ink">{t('impression.photosHelp')}</p>
              )}
            </div>
          </>
        )}

        {member ? (
          !anonymous && (
            <div className="flex items-center gap-3.5 rounded-md bg-surface px-4 py-3.5">
              <span
                aria-hidden
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-small font-bold text-white"
              >
                {member.initials}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-small text-muted-ink">{t('sendingAs')}</span>
                <strong className="truncate text-[15px] font-medium">
                  {member.name} · {member.email}
                </strong>
              </span>
            </div>
          )
        ) : showAbout ? (
          <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
            <legend className="mb-3 p-0 text-small font-medium text-ink">
              {t('about')}
              <span className="font-normal text-muted-ink"> · {t('aboutHint')}</span>
            </legend>
            <div className="grid gap-x-5 gap-y-5.5 sm:grid-cols-2">
              <FormField id={idOf('name')} label={t('name')}>
                {(control) => (
                  <Input
                    {...control}
                    name={SUBMIT_FIELDS.name}
                    autoComplete="name"
                    maxLength={IDEA_LIMITS.name}
                  />
                )}
              </FormField>
              <FormField id={idOf('email')} label={t('email')} error={messageFor('email')}>
                {(control) => (
                  <Input
                    {...control}
                    name={SUBMIT_FIELDS.email}
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    maxLength={IDEA_LIMITS.email}
                    onChange={(event) => setTyped(event.target.value)}
                  />
                )}
              </FormField>
            </div>
            {typed.trim() !== '' ? (
              <ConsentField id={idOf('consent')} name={SUBMIT_FIELDS.consent} error={messageFor('consent')}>
                {t.rich('consent', {
                  site: siteName,
                  months,
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
            ) : (
              <p className="text-small text-muted-ink">{t('consentHint')}</p>
            )}
          </fieldset>
        ) : null}

        {!idea && member === null && (
          <Notice>
            {t.rich('guestNote', {
              link: (chunks) => (
                <ActionLink
                  href="/login?next=%2Fsubmit%3Ftab%3Dimpression"
                  className="font-medium text-brand-dark underline"
                >
                  {chunks}
                </ActionLink>
              ),
            })}
          </Notice>
        )}

        <label className={boxClass(anonymous)}>
          <span className="flex h-6 items-center">
            <Checkbox
              name={SUBMIT_FIELDS.anonymous}
              checked={anonymous}
              onChange={(event) => setAnonymous(event.target.checked)}
            />
          </span>
          <span className="flex flex-col">
            <strong className="text-[15px] font-medium">{t('anonymous')}</strong>
            <span className="text-small text-muted-ink">
              {anonymous ? t('anonymousOn') : t('anonymousOff')}
            </span>
          </span>
        </label>

        {canMemory && (
          <div className={cn(boxClass(memoryOn), 'flex-col')}>
            <label className="flex cursor-pointer items-start gap-3">
              <span className="flex h-6 items-center">
                <Checkbox
                  name={SUBMIT_FIELDS.asMemory}
                  checked={asMemory}
                  onChange={(event) => setAsMemory(event.target.checked)}
                />
              </span>
              <span className="flex flex-col">
                <strong className="text-[15px] font-medium">{t('memory.label')}</strong>
                <span className="text-small text-muted-ink">{t('memory.help')}</span>
              </span>
            </label>
            {memoryOn && (
              <FormField
                id={idOf('memory-title')}
                label={t('memory.title')}
                required
                help={t('memory.titleHelp')}
                error={messageFor('memoryTitle')}
                className="mt-3"
              >
                {(control) => (
                  <Input {...control} name={SUBMIT_FIELDS.memoryTitle} maxLength={IDEA_LIMITS.memoryTitle} />
                )}
              </FormField>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <SubmitButton
            sending={sending}
            disabled={limited}
            className={cn('max-sm:w-full sm:w-fit', limited && 'opacity-45')}
          >
            <Send aria-hidden />
            {idea ? t('send.idea') : memoryOn ? t('send.memory') : t('send.impression')}
          </SubmitButton>
          <p className="text-small text-muted-ink">{t('protected', { max: RATE_LIMIT.perHour })}</p>
        </div>
      </form>
    </div>
  );
}

/** The confirmation that replaces the form: named, anonymous, a visitor's feedback, a member's Memory. */
function Confirmation({
  receipt,
  meeting,
  onAnother,
}: {
  receipt: SubmitReceipt;
  meeting: SubmitFormProps['meeting'];
  onAnother: () => void;
}) {
  const t = useTranslations('ideas.submit.success');
  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
  const another = (
    <button
      type="button"
      onClick={onAnother}
      className="inline-flex h-12 cursor-pointer items-center font-medium text-brand-dark hover:underline"
    >
      {receipt.kind === 'idea' ? t('idea.another') : t('impression.another')}
    </button>
  );

  if (receipt.kind === 'idea') {
    const reply = receipt.email !== null;
    return (
      <FormSuccess
        title={receipt.firstName ? t('idea.titleNamed', { name: receipt.firstName }) : t('idea.title')}
        nextTitle={t('next')}
        steps={[
          meeting ? t('idea.step1', { day: meeting.day, time: meeting.time }) : t('idea.step1Plain'),
          reply ? t('idea.step2') : t('idea.step2NoReply'),
          t('idea.step3'),
        ]}
        actions={
          <>
            <ActionLink href="/upcoming" className={buttonVariants({ variant: 'secondary' })}>
              {t('idea.upcoming')}
            </ActionLink>
            {another}
          </>
        }
      >
        <p className="text-[17px] leading-[1.6]">
          {receipt.email
            ? t.rich('idea.copy', { email: receipt.email, strong })
            : receipt.anonymous
              ? t('idea.anonymous')
              : t('idea.noEmail')}
        </p>
      </FormSuccess>
    );
  }

  return (
    <FormSuccess
      title={
        receipt.asMemory && receipt.firstName
          ? t('impression.memoryTitle', { name: receipt.firstName })
          : t('impression.title', { event: receipt.eventTitle })
      }
      nextTitle={t('next')}
      steps={
        receipt.asMemory
          ? [t('impression.memoryStep1'), t('impression.memoryStep2'), t('impression.memoryStep3')]
          : [t('impression.step1'), t('impression.step2'), t('impression.step3')]
      }
      actions={
        <>
          {receipt.asMemory ? (
            <ActionLink href="/profile#memories" className={buttonVariants({ variant: 'secondary' })}>
              {t('impression.profile')}
            </ActionLink>
          ) : (
            receipt.eventSlug && (
              <ActionLink
                href={`/memories?event=${receipt.eventSlug}`}
                className={buttonVariants({ variant: 'secondary' })}
              >
                {t('impression.memories', { event: receipt.eventTitle })}
              </ActionLink>
            )
          )}
          {another}
        </>
      }
    >
      <p className="text-[17px] leading-[1.6]">
        {receipt.asMemory ? t('impression.memoryText') : t('impression.text')}
      </p>
    </FormSuccess>
  );
}
