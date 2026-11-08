'use client';

import { ArrowLeft, CircleAlert, Eye, Info, Send } from 'lucide-react';
import dynamic from 'next/dynamic';
import { NextIntlClientProvider, useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { readLocalCopy, useAutosave } from '@/shared/forms/use-autosave';
import { useUnsavedChanges } from '@/shared/forms/use-unsaved-changes';
import { formatDate } from '@/shared/i18n/format';
import { Link, useRouter } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';
import { ErrorSummary, type FieldErrorItem } from '@/shared/ui/form/error-summary';
import { FormField } from '@/shared/ui/form/form-field';
import { Notice } from '@/shared/ui/notice';
import { Button } from '@/shared/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { saveMemoryDraft, submitMemory } from '../../actions/memory-editor';
import { MEMORY_LIMITS, submitProblems, textFacts } from '../../domain/memory-fields';
import type { MemoryContent } from '../../types';
import { PhotoManager } from './photo-manager';

// Tiptap is heavy: it loads when the editor is on screen, not with the page.
const RichTextEditor = dynamic(
  () => import('@/shared/admin-ui/rich-text-editor').then((module) => module.RichTextEditor),
  {
    ssr: false,
    loading: () => <div aria-hidden className="min-h-[300px] rounded-sm border border-line-input" />,
  },
);

export type EditorEvent = { id: string; title: string; startsAt: string; city: string; country: string };

export type EditorInitial = {
  /** null: a new Memory (nothing saved yet). */
  id: string | null;
  slug: string | null;
  content: MemoryContent;
  /** draft: new, draft or not approved. live: editing a published Memory. */
  mode: 'draft' | 'live';
  status: 'new' | 'draft' | 'rejected' | 'published';
  updatedAt: string | null;
  rejection: { reason: string; by: string; at: string } | null;
  live: { publishedAt: string; reads: number } | null;
  /** A published Memory whose earlier changes were not approved. */
  revisionRejected: { reason: string } | null;
  /** An earlier submit of changes is waiting: submitting again replaces it. */
  revisionPending: boolean;
};

/** The labels the shared rich text editor and sortable list read from `admin.ui.*` (English only there). */
export type AdminUiStrings = { richText: Record<string, string>; sortable: Record<string, string> };

const OTHER = '__other__';
const storageKey = (id: string | null) => `memory-draft:${id ?? 'new'}`;

const subscribeNothing = () => () => undefined;

/** The Memory editor (MemoryEditor, -Mobile, -Errors, -Rejected, -LiveEdit). Client only: it reads the copy kept on this device. */
export function MemoryEditor(props: {
  initial: EditorInitial;
  events: EditorEvent[];
  preselectEventId: string | null;
  adminUi: AdminUiStrings;
}) {
  const mounted = React.useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  if (!mounted) return <div aria-hidden className="min-h-[70vh]" />;
  return <EditorBody {...props} />;
}

function EditorBody({
  initial,
  events,
  preselectEventId,
  adminUi,
}: {
  initial: EditorInitial;
  events: EditorEvent[];
  preselectEventId: string | null;
  adminUi: AdminUiStrings;
}) {
  const t = useTranslations('memories.editor');
  const locale = useLocale();
  const router = useRouter();
  const live = initial.mode === 'live';

  // What the editor starts with: the server's version, or the copy kept on this device when that is
  // newer (a closed tab or a lost connection), or the event the link came from on a new Memory.
  const [start] = React.useState(() => {
    const local = readLocalCopy<MemoryContent>(storageKey(initial.id));
    const newer =
      local &&
      local.savedAt > Date.parse(initial.updatedAt ?? '1970-01-01') &&
      JSON.stringify(local.value) !== JSON.stringify(initial.content);
    if (newer) return { content: local.value, restored: true };
    const event = initial.id === null ? events.find((item) => item.id === preselectEventId) : undefined;
    if (event)
      return {
        content: {
          ...initial.content,
          eventId: event.id,
          city: initial.content.city || event.city,
          country: initial.content.country || event.country,
          happenedOn: initial.content.happenedOn ?? event.startsAt.slice(0, 10),
        },
        restored: false,
      };
    return { content: initial.content, restored: false };
  });
  const [content, setContent] = React.useState<MemoryContent>(start.content);
  const [id, setId] = React.useState(initial.id);
  const idRef = React.useRef(initial.id);
  const [showProblems, setShowProblems] = React.useState(false);
  const [summaryTick, setSummaryTick] = React.useState(0);
  const [sending, setSending] = React.useState(false);
  const [sendFailure, setSendFailure] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState<{ title: string; revision: boolean } | null>(null);
  const [otherChosen, setOtherChosen] = React.useState(
    () => !start.content.eventId && start.content.otherEventName !== '',
  );
  const summary = React.useRef<HTMLDivElement>(null);
  const failureRef = React.useRef<HTMLDivElement>(null);
  const prefilled = React.useRef<{ city: string; country: string; date: string | null } | null>(null);

  const save = React.useCallback(async (value: MemoryContent) => {
    const result = await saveMemoryDraft({ id: idRef.current, content: value });
    if (!result.ok) return false;
    if (idRef.current === null) window.history.replaceState(null, '', `?draft=${result.data.id}`);
    idRef.current = result.data.id;
    setId(result.data.id);
    return true;
  }, []);

  const autosave = useAutosave({
    value: content,
    enabled: !live,
    save,
    storageKey: storageKey(id),
    initialSaved: initial.content,
  });
  const { dirty } = autosave;
  const leave = useUnsavedChanges(dirty && !sent);

  const problems = React.useMemo(() => submitProblems(content), [content]);
  const facts = textFacts(content.body);
  const set = (patch: Partial<MemoryContent>) => setContent((current) => ({ ...current, ...patch }));

  function chooseEvent(value: string) {
    if (value === '') {
      setOtherChosen(false);
      return set({ eventId: null, otherEventName: '' });
    }
    if (value === OTHER) {
      setOtherChosen(true);
      return set({ eventId: null });
    }
    const event = events.find((item) => item.id === value);
    if (!event) return;
    setOtherChosen(false);
    // City, country and date follow the event until the person has written their own.
    const last = prefilled.current;
    const city = !content.city || content.city === last?.city ? event.city : content.city;
    const country = !content.country || content.country === last?.country ? event.country : content.country;
    const date =
      !content.happenedOn || content.happenedOn === last?.date
        ? event.startsAt.slice(0, 10)
        : content.happenedOn;
    prefilled.current = { city: event.city, country: event.country, date: event.startsAt.slice(0, 10) };
    set({ eventId: event.id, otherEventName: '', city, country, happenedOn: date });
  }

  // Focus moves in an effect, never in a timer: it races with rendering.
  React.useEffect(() => {
    if (summaryTick > 0) summary.current?.focus();
  }, [summaryTick]);
  React.useEffect(() => {
    if (sendFailure) failureRef.current?.focus();
  }, [sendFailure]);

  const errorItems: FieldErrorItem[] = showProblems
    ? problems.map((problem) => {
        switch (problem.field) {
          case 'title':
            return { fieldId: 'me-title', label: t('errors.field.title'), message: t('errors.empty') };
          case 'event':
            return { fieldId: 'me-event', label: t('errors.field.event'), message: t('errors.empty') };
          case 'place':
            return {
              fieldId: content.city.trim() ? 'me-country' : 'me-city',
              label: t('errors.field.place'),
              message: t('errors.empty'),
            };
          case 'text':
            return { fieldId: 'me-text', label: t('errors.field.text'), message: t('errors.empty') };
          case 'cover':
            return {
              fieldId: 'me-photos-cover-file',
              label: t('errors.field.cover'),
              message: t('errors.missing'),
            };
          case 'coverAlt':
            return {
              fieldId: 'me-photos-cover-alt',
              label: t('errors.field.coverAlt'),
              message: t('errors.empty'),
            };
          case 'photoAlt':
            return {
              fieldId: `me-photos-alt-${content.photos.find((photo) => !photo.alt.trim())?.id ?? ''}`,
              label: t('errors.field.photoAlt', { count: problem.count }),
              message: t('errors.needAlt', { count: problem.count }),
            };
        }
      })
    : [];
  const has = (field: (typeof problems)[number]['field']) =>
    showProblems && problems.some((p) => p.field === field);

  async function submit() {
    setSendFailure(null);
    setShowProblems(true);
    if (problems.length > 0) {
      setSummaryTick((tick) => tick + 1);
      return;
    }
    setSending(true);
    const result = await submitMemory({ id: idRef.current, content }).catch(() => null);
    setSending(false);
    if (result?.ok) {
      autosave.markSaved();
      setSent({ title: result.data.title, revision: result.data.revision });
      return;
    }
    setSendFailure(
      result && !result.ok && result.error === 'conflict' ? t('errors.locked') : t('errors.sendFailed'),
    );
  }

  async function saveDraft() {
    if (await autosave.saveNow()) toast.success(t('toast.saved'));
    else
      toast.error(t('toast.failed'), {
        action: { label: t('retry'), onClick: () => void autosave.saveNow() },
      });
  }

  async function preview() {
    if (!(await autosave.saveNow())) {
      toast.error(t('toast.failed'));
      return;
    }
    router.push(`/memories/${initial.slug ?? idRef.current ?? ''}`);
  }

  async function saveAndLeave() {
    if (await autosave.saveNow()) leave.leave();
    else toast.error(t('toast.failed'));
  }

  if (sent)
    return (
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-5 py-16 text-center lg:py-24">
        <span
          aria-hidden
          className="flex size-16 items-center justify-center rounded-full bg-brand-tint text-brand"
        >
          <Send className="size-7" />
        </span>
        <h1 className="type-h2">{t('sent.title')}</h1>
        <p role="status" className="text-body text-muted-ink">
          {t(sent.revision ? 'sent.textRevision' : 'sent.text', { title: sent.title })}
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild block className="sm:w-auto">
            <Link href="/profile#memories">{t('sent.toMine')}</Link>
          </Button>
          <Button asChild variant="secondary" block className="sm:w-auto">
            <a href={`/${locale === 'mk' ? '' : 'en/'}memories/new`}>{t('sent.another')}</a>
          </Button>
        </div>
      </div>
    );

  const primaryLabel = live
    ? t('submitChanges')
    : initial.status === 'rejected'
      ? t('resubmit')
      : t('submit');
  const statusChip = live
    ? t('chip.published')
    : initial.status === 'rejected'
      ? t('chip.rejected')
      : t('chip.draft');
  const heading = initial.status === 'new' || initial.status === 'draft' ? t('titleNew') : t('titleEdit');
  const time = (date: Date) => formatDate(date, locale, 'time');
  let saveLine = '';
  if (autosave.status === 'saving') saveLine = t('saving');
  else if (autosave.status === 'offline') saveLine = t('offline');
  else if (autosave.status === 'error') saveLine = t('failed');
  else if (dirty) saveLine = t('unsaved');
  else if (autosave.savedAt) saveLine = t('savedAt', { time: time(new Date(autosave.savedAt)) });
  else if (!live && initial.updatedAt && id)
    saveLine = t('savedAt', { time: time(new Date(initial.updatedAt)) });

  const buttons = (
    <>
      {!live && (
        <Button type="button" variant="quiet" size="sm" onClick={() => void saveDraft()} disabled={sending}>
          {t('saveDraft')}
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        onClick={() => void submit()}
        disabled={sending}
        aria-busy={sending || undefined}
      >
        {sending ? t('sending') : primaryLabel}
      </Button>
    </>
  );

  const eventSelected = content.eventId ?? (otherChosen ? OTHER : '');

  function discard() {
    try {
      window.localStorage.removeItem(storageKey(idRef.current));
    } catch {
      // Storage is blocked: there is no copy to remove.
    }
    leave.leave();
  }

  return (
    <div className="flex flex-col pb-24 lg:pb-12">
      <div className="sticky top-16 z-10 -mx-4 border-b border-line bg-white px-4 py-3 sm:-mx-6 sm:px-6 xl:top-18">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href="/profile#memories"
            aria-label={t('back')}
            className="flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate text-[20px] leading-tight font-bold">{heading}</h1>
              <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-[13px] font-medium">
                {statusChip}
              </span>
            </div>
            <p role="status" className="flex items-center gap-2 text-small text-muted-ink">
              {saveLine}
              {autosave.status === 'error' && (
                <button
                  type="button"
                  className="font-medium text-brand-dark underline"
                  onClick={() => void autosave.saveNow()}
                >
                  {t('retry')}
                </button>
              )}
            </p>
          </div>
          {!live && (
            <Button type="button" variant="secondary" size="sm" onClick={() => void preview()}>
              <Eye aria-hidden />
              {t('preview')}
            </Button>
          )}
          <div className="hidden gap-2.5 lg:flex">{buttons}</div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 pt-6">
        {start.restored && (
          <Notice role="status" icon={<Info className="size-[22px]" />}>
            {t('restored')}
          </Notice>
        )}
        {initial.rejection && (
          <Notice
            tone="urgent"
            role="status"
            title={t('rejected.title')}
            actions={
              <Link
                href="/contact?subject=memories"
                className="text-small font-medium text-brand-dark underline"
              >
                {t('rejected.ask')}
              </Link>
            }
          >
            <p className="italic">“{initial.rejection.reason}”</p>
            <p className="mt-1 text-muted-ink">
              {t('rejected.by', {
                name: initial.rejection.by,
                date: formatDate(initial.rejection.at, locale, 'dayMonth'),
              })}
            </p>
          </Notice>
        )}
        {live && initial.live && (
          <Notice
            tone="info"
            role="status"
            title={t('live.title')}
            actions={
              initial.slug && (
                <a
                  href={`/${locale === 'mk' ? '' : 'en/'}memories/${initial.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-small font-medium text-brand-dark underline"
                >
                  {t('live.view')}
                </a>
              )
            }
          >
            {t('live.text', {
              date: formatDate(initial.live.publishedAt, locale, 'date'),
              reads: initial.live.reads,
            })}
            {initial.revisionPending && <p className="mt-1">{t('live.pending')}</p>}
            {initial.revisionRejected && (
              <p className="mt-1 font-medium text-brand-dark">
                {t('live.rejected', { reason: initial.revisionRejected.reason })}
              </p>
            )}
          </Notice>
        )}
        {errorItems.length > 0 && (
          <div className="flex flex-col gap-2">
            <ErrorSummary
              ref={summary}
              title={t('errors.banner', { count: errorItems.length })}
              errors={errorItems}
            />
            {!live && <p className="text-small text-muted-ink">{t('errors.bannerNote')}</p>}
          </div>
        )}
        {sendFailure && (
          <div ref={failureRef} role="alert" tabIndex={-1} className="outline-none">
            <Notice tone="urgent" icon={<CircleAlert className="size-[22px] text-brand" />}>
              {sendFailure}
            </Notice>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <div className="flex min-w-0 flex-col gap-6">
            <section
              aria-labelledby="me-story"
              className="flex flex-col gap-5 rounded-lg border border-line bg-white p-5 sm:p-7"
            >
              <h2 id="me-story" className="text-[20px] font-bold">
                {t('story')}
              </h2>
              <FormField
                id="me-title"
                label={t('field.title')}
                required
                counter={`${content.title.length} / ${MEMORY_LIMITS.title}`}
                error={has('title') ? t('errors.title') : undefined}
              >
                {(control) => (
                  <Input
                    {...control}
                    value={content.title}
                    maxLength={MEMORY_LIMITS.title}
                    placeholder={t('field.titlePlaceholder')}
                    onChange={(event) => set({ title: event.target.value })}
                  />
                )}
              </FormField>

              <FormField
                id="me-event"
                label={t('field.event')}
                required
                help={t('field.eventHelp')}
                error={has('event') ? t('errors.event') : undefined}
              >
                {(control) => (
                  <NativeSelect
                    {...control}
                    value={eventSelected}
                    onChange={(event) => chooseEvent(event.target.value)}
                  >
                    <NativeSelectOption value="">{t('field.eventPlaceholder')}</NativeSelectOption>
                    {events.map((event) => (
                      <NativeSelectOption key={event.id} value={event.id}>
                        {event.title} · {formatDate(event.startsAt, locale, 'monthYearShort')}
                      </NativeSelectOption>
                    ))}
                    <NativeSelectOption value={OTHER}>{t('field.eventOther')}</NativeSelectOption>
                  </NativeSelect>
                )}
              </FormField>
              {!content.eventId && eventSelected === OTHER && (
                <FormField id="me-other" label={t('field.otherName')} help={t('field.otherNameHelp')}>
                  {(control) => (
                    <Input
                      {...control}
                      value={content.otherEventName}
                      maxLength={MEMORY_LIMITS.otherEvent}
                      onChange={(event) => set({ otherEventName: event.target.value })}
                    />
                  )}
                </FormField>
              )}

              <div className="grid gap-5 sm:grid-cols-3">
                <FormField
                  id="me-city"
                  label={t('field.city')}
                  required
                  error={has('place') && !content.city.trim() ? t('errors.place') : undefined}
                >
                  {(control) => (
                    <Input
                      {...control}
                      value={content.city}
                      maxLength={MEMORY_LIMITS.city}
                      onChange={(event) => set({ city: event.target.value })}
                    />
                  )}
                </FormField>
                <FormField
                  id="me-country"
                  label={t('field.country')}
                  required
                  error={has('place') && !!content.city.trim() ? t('errors.place') : undefined}
                >
                  {(control) => (
                    <Input
                      {...control}
                      value={content.country}
                      maxLength={MEMORY_LIMITS.country}
                      onChange={(event) => set({ country: event.target.value })}
                    />
                  )}
                </FormField>
                <FormField id="me-date" label={t('field.date')} optional>
                  {(control) => (
                    <Input
                      {...control}
                      type="date"
                      value={content.happenedOn ?? ''}
                      onChange={(event) => set({ happenedOn: event.target.value || null })}
                    />
                  )}
                </FormField>
              </div>
              <p className="-mt-2 text-[13px] text-muted-ink">{t('field.dateHelp')}</p>

              <div className="flex flex-col gap-1.5">
                <span id="me-text-label" className="text-small font-medium">
                  {t('field.text')}{' '}
                  <span className="text-brand-dark" aria-hidden>
                    *
                  </span>
                </span>
                <NextIntlClientProvider locale={locale} messages={{ admin: { ui: adminUi } }}>
                  <RichTextEditor
                    id="me-text"
                    labelledBy="me-text-label"
                    describedBy="me-text-help"
                    value={content.body}
                    onChange={(body) => set({ body })}
                    invalid={has('text')}
                    minHeight={300}
                  />
                </NextIntlClientProvider>
                <p
                  id="me-text-help"
                  className="flex flex-wrap justify-between gap-x-4 text-[13px] text-muted-ink"
                >
                  <span>{t('field.textHelp')}</span>
                  <span>{t('field.words', { count: facts.words, minutes: facts.minutes })}</span>
                </p>
                {has('text') && (
                  <p className="flex items-center gap-1.5 text-small font-medium text-brand-dark">
                    <CircleAlert className="size-4" aria-hidden />
                    {t('errors.text')}
                  </p>
                )}
              </div>
            </section>

            <section
              aria-labelledby="me-photos-title"
              className="flex flex-col gap-5 rounded-lg border border-line bg-white p-5 sm:p-7"
            >
              <h2 id="me-photos-title" className="text-[20px] font-bold">
                {t('photos')}
              </h2>
              <PhotoManager
                idPrefix="me-photos"
                cover={content.cover}
                photos={content.photos}
                onCover={(cover) => set({ cover })}
                onPhotos={(photos) => set({ photos })}
                coverAltError={has('coverAlt')}
              />
            </section>
            <p className="text-small text-muted-ink">{live ? t('footnoteLive') : t('footnote')}</p>
          </div>

          <EditorAside
            live={live}
            problems={problems}
            words={facts.words}
            hasTitle={!problems.some((p) => p.field === 'title')}
          />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-[1fr_1.4fr] gap-2.5 border-t border-line bg-white p-3 lg:hidden [&>*]:w-full">
        {buttons}
      </div>

      <Dialog open={leave.open} onOpenChange={(open) => !open && leave.stay()}>
        <DialogContent role="alertdialog">
          <DialogHeader>
            <DialogTitle>{t('leave.title')}</DialogTitle>
            <DialogDescription className="text-small">
              {live ? t('leave.textLive') : t('leave.text')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={cn(!live && 'sm:flex-wrap')}>
            <Button type="button" variant="quiet" size="sm" onClick={leave.stay}>
              {t('leave.stay')}
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={discard}>
              {t('leave.discard')}
            </Button>
            {!live && (
              <Button type="button" size="sm" onClick={() => void saveAndLeave()}>
                {t('leave.saveLeave')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** "Before you submit", "What happens next" and the tips (MemoryEditor, desktop only). */
function EditorAside({
  live,
  problems,
  words,
  hasTitle,
}: {
  live: boolean;
  problems: ReturnType<typeof submitProblems>;
  words: number;
  hasTitle: boolean;
}) {
  const t = useTranslations('memories.editor.aside');
  const failing = (field: string) => problems.some((problem) => problem.field === field);
  const photoAlt = problems.find((problem) => problem.field === 'photoAlt');
  const row = (ok: boolean, text: React.ReactNode, key: string) => (
    <li
      key={key}
      className={cn('flex items-start gap-2 text-small', ok ? 'text-ink' : 'font-medium text-brand-dark')}
    >
      <span aria-hidden className="mt-0.5 shrink-0">
        {ok ? '✓' : <CircleAlert className="size-4" />}
      </span>
      <span>
        {text}
        <span className="sr-only"> {ok ? t('done') : t('todo')}</span>
      </span>
    </li>
  );
  return (
    <aside
      className="flex flex-col gap-5 max-lg:hidden lg:sticky lg:top-28 lg:self-start"
      aria-label={t('label')}
    >
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-white p-5">
        <h2 className="text-[16px] font-bold">{t('checklist')}</h2>
        <ul className="flex flex-col gap-2">
          {row(hasTitle, t('items.title'), 'title')}
          {row(!failing('event') && !failing('place'), t('items.event'), 'event')}
          {row(!failing('text'), t('items.text', { words }), 'text')}
          {row(!failing('cover') && !failing('coverAlt'), t('items.cover'), 'cover')}
          {photoAlt && photoAlt.field === 'photoAlt'
            ? row(false, t('items.photoAlt', { count: photoAlt.count }), 'photoAlt')
            : row(true, t('items.altOk'), 'altOk')}
        </ul>
      </section>
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-white p-5">
        <h2 className="text-[16px] font-bold">{t('next')}</h2>
        <ol className="flex flex-col gap-3 text-small">
          {(live ? (['live1', 'live2', 'live3'] as const) : (['step1', 'step2', 'step3'] as const)).map(
            (step, index) => (
              <li key={step} className="flex gap-3">
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-tint text-[13px] font-bold text-brand-dark"
                >
                  {index + 1}
                </span>
                <span>
                  <strong className="block">{t(`${step}.title`)}</strong>
                  <span className="text-muted-ink">{t(`${step}.text`)}</span>
                </span>
              </li>
            ),
          )}
        </ol>
      </section>
      <section className="flex flex-col gap-3 rounded-lg bg-surface p-5">
        <h2 className="text-[16px] font-bold">{t('tips')}</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-small text-ink-2">
          {(['tip1', 'tip2', 'tip3', 'tip4'] as const).map((tip) => (
            <li key={tip}>{t(tip)}</li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
