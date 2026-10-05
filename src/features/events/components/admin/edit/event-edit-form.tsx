'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import type { MediaItem } from '@/features/media';
import { AdminPage, type AdminBadgeTone } from '@/shared/admin-ui/admin-page';
import { ConfirmDeleteDialog, UnsavedChangesDialog } from '@/shared/admin-ui/dialogs';
import { EditFormLayout, FormSection } from '@/shared/admin-ui/form-section';
import { SaveBar } from '@/shared/admin-ui/save-bar';
import type { FieldErrors } from '@/shared/forms/action-result';
import { useUnsavedChanges } from '@/shared/forms/use-unsaved-changes';
import { AdminPageCrumb } from '@/shared/layout/admin/admin-shell';
import { slugify } from '@/shared/lib/slug';
import type { Localized } from '@/shared/types/localized';
import { useNow } from '@/shared/ui/clock-provider';
import { ErrorSummary } from '@/shared/ui/form/error-summary';
import { Button } from '@/shared/ui/primitives/button';

import { createTaxonomyItem } from '../../../actions/event-taxonomy';
import { deleteEvents } from '../../../actions/admin-events';
import { saveEvent } from '../../../actions/save-event';
import { eventTiming } from '../../../domain/event-timing';
import type { EventDraftInput } from '../../../schemas/event.schema';
import type { ContentStatus, EventRecord } from '../../../types';
import { ApplicationsSection, CategorySection, PublishingSection, SeoSection } from './aside-sections';
import { EventFormContext, type EventFormContextValue, fieldIdFor } from './form-kit';
import {
  AfterEventSection,
  BasicInfoSection,
  DatePlaceSection,
  DescriptionSection,
  PracticalSection,
  ProgrammeSection,
  TopicsSection,
} from './main-sections';
import { CoverSection, DocumentsSection, GallerySection } from './media-sections';

type Taxonomy = { id: string; name: Localized }[];

type EventEditFormProps = {
  /** null: a new event (not saved yet). */
  record: EventRecord | null;
  input: EventDraftInput;
  media: MediaItem[];
  types: Taxonomy;
  topics: Taxonomy;
  canDelete: boolean;
  canAddTopics: boolean;
  /** Server "now" (ISO): upcoming or past, for the page address. */
  now: string;
};

const STATUS_TONE: Record<ContentStatus, AdminBadgeTone> = {
  published: 'dark',
  draft: 'outline',
  hidden: 'muted',
};

const toInput = ({
  id: _id,
  createdAt: _c,
  updatedAt: _u,
  updatedBy: _b,
  ...input
}: EventRecord): EventDraftInput => input;

const KNOWN_ERRORS = [
  'required',
  'tooLong',
  'tooMany',
  'slug',
  'slugTaken',
  'dateTime',
  'date',
  'endBeforeStart',
  'altRequired',
  'deadlineBeforeOpen',
  'deadlineAfterEnd',
  'url',
  'videoUrl',
  'email',
  'number',
  'unknown',
  'unknownFile',
] as const;

/** /admin/events/new and /admin/events/[id] (AdminEventEdit, AdminEditStates). */
export function EventEditForm({
  record: initialRecord,
  input,
  media: initialMedia,
  types,
  topics: initialTopics,
  canDelete,
  canAddTopics,
  now,
}: EventEditFormProps) {
  const t = useTranslations('admin.events.edit');
  const tEvents = useTranslations('admin.events');
  const tStatus = useTranslations('admin.ui.status');
  const format = useFormatter();
  const router = useRouter();

  const [record, setRecord] = React.useState(initialRecord);
  const [saved, setSaved] = React.useState(input);
  const [values, setValues] = React.useState(input);
  const [media, setMedia] = React.useState(() =>
    Object.fromEntries(initialMedia.map((item) => [item.id, item])),
  );
  const [topics, setTopics] = React.useState(initialTopics);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [summaryFor, setSummaryFor] = React.useState<'publish' | 'draft'>('publish');
  // New events take their address from the title until it's edited by hand.
  const [slugTouched, setSlugTouched] = React.useState(initialRecord !== null);
  const [deleting, setDeleting] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const summaryRef = React.useRef<HTMLDivElement>(null);

  // Stable per form: the /new form never turns into the saved event (see save()).
  const fieldId = fieldIdFor(initialRecord?.id ?? 'new');
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const guard = useUnsavedChanges(dirty);
  const live = record !== null && record.status !== 'draft';
  const timing = eventTiming(record ?? values, new Date(now));
  const clockNow = useNow(new Date(now), 30_000);

  const update = React.useCallback(
    (recipe: (draft: EventDraftInput) => void) =>
      setValues((current) => {
        const draft = structuredClone(current);
        recipe(draft);
        if (!slugTouched) draft.slug = slugify(draft.title.en || draft.title.mk);
        return draft;
      }),
    [slugTouched],
  );

  const message = (key: string) =>
    t(`errors.${(KNOWN_ERRORS as readonly string[]).includes(key) ? (key as 'required') : 'unexpected'}`);
  const error = React.useCallback(
    (path: string) => {
      const key = fieldErrors[path]?.[0];
      return key ? message(key) : undefined;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `message` only depends on t
    [fieldErrors, t],
  );

  const labelFor = (path: string): string => {
    const parts = path.split('.');
    const [head = '', a = ''] = parts;
    const labels: Record<string, string> = {
      'fee.price': t('labels.feePrice'),
      'fee.note': t('labels.feeNote'),
      'cover.alt': t('labels.coverAlt'),
      'seo.title': t('labels.seoTitle'),
      'seo.description': t('labels.seoDescription'),
      'seo.shareImageId': t('labels.shareImage'),
    };
    if (labels[`${head}.${a}`]) return labels[`${head}.${a}`]!;
    if (head === 'agenda') return t('labels.agenda', { number: Number(a) + 1 });
    if (head === 'gallery') return t('labels.gallery', { number: Number(a) + 1 });
    if (head === 'applications') return t(`labels.${a}` as 'labels.deadline');
    return t(`labels.${head}` as 'labels.title');
  };

  // One line per field (a bilingual field reports once).
  const summary = Object.entries(fieldErrors)
    .map(([path, keys]) => ({ fieldId: fieldId(path), label: labelFor(path), message: message(keys[0]!) }))
    .filter((item, index, all) => all.findIndex((other) => other.fieldId === item.fieldId) === index);

  const save = (intent: 'draft' | 'publish') =>
    new Promise<boolean>((resolve) =>
      startTransition(async () => {
        const wasLive = live;
        const result = await saveEvent({ id: record?.id, intent, autoSlug: !slugTouched, event: values });
        if (!result.ok) {
          if (result.error === 'validation') {
            setFieldErrors(result.fieldErrors);
            setSummaryFor(intent);
            requestAnimationFrame(() => summaryRef.current?.focus());
          } else {
            toast.error(
              t(
                result.error === 'forbidden'
                  ? 'toasts.forbidden'
                  : result.error === 'not_found'
                    ? 'toasts.notFound'
                    : 'toasts.unexpected',
              ),
              result.error === 'unexpected' ? { duration: Infinity } : undefined,
            );
          }
          resolve(false);
          return;
        }

        const { record: next, warnings } = result.data;
        const description = warnings.includes('defaultCover') ? t('toasts.defaultCover') : undefined;
        const toastKey =
          !record && intent === 'draft'
            ? 'created'
            : intent === 'draft'
              ? 'draftSaved'
              : next.status === 'draft'
                ? 'unpublished'
                : next.status === 'hidden'
                  ? 'hidden'
                  : wasLive
                    ? 'updated'
                    : 'published';
        toast.success(t(`toasts.${toastKey}`), { description });

        if (!record) {
          // A new event opens at its own address. Next keeps this page mounted (hidden) for
          // back / forward, so it goes back to a blank form instead of becoming the saved event.
          setSaved(input);
          setValues(input);
          setFieldErrors({});
          setSlugTouched(false);
          router.replace(`/admin/events/${next.id}` as Route);
        } else {
          const nextInput = toInput(next);
          setRecord(next);
          setSaved(nextInput);
          setValues(nextInput);
          setFieldErrors({});
        }
        resolve(true);
      }),
    );

  const createTopic = canAddTopics
    ? async (name: string) => {
        const result = await createTaxonomyItem({ kind: 'topics', name: { mk: name } });
        if (!result.ok)
          return {
            error:
              result.error === 'validation' && result.fieldErrors['name.mk']?.[0] === 'duplicate'
                ? t('errors.unknown')
                : t('errors.unexpected'),
          };
        setTopics((list) => [...list, { id: result.data.id, name: { mk: name } }]);
        toast.success(t('toasts.topicAdded'));
        return { id: result.data.id, label: name };
      }
    : undefined;

  const context: EventFormContextValue = {
    values,
    update,
    error,
    media,
    addMedia: (items) =>
      setMedia((current) => ({ ...current, ...Object.fromEntries(items.map((item) => [item.id, item])) })),
    timing,
    canAddTopics,
    canDelete,
    isNew: record === null,
    fieldId,
  };

  const displayTitle = record ? record.title.mk || tEvents('untitled') : t('newTitle');
  const status = record?.status ?? 'draft';

  return (
    <EventFormContext value={context}>
      <AdminPage>
        <AdminPageCrumb label={displayTitle} />
        <SaveBar
          headingLevel={1}
          title={displayTitle}
          status={{ label: tStatus(status), tone: STATUS_TONE[status] }}
          state={pending ? 'saving' : dirty ? 'dirty' : 'clean'}
          published={live}
          savedAt={record?.updatedAt}
          back={{ href: '/admin/events', label: t('back') }}
          subtitle={
            record
              ? t('subtitle.saved', {
                  timing,
                  time: format.relativeTime(new Date(record.updatedAt), clockNow),
                  name: record.updatedBy.name,
                })
              : t('subtitle.new')
          }
          onSaveDraft={() => void save('draft')}
          onPublish={() => void save('publish')}
          onDiscard={() => {
            setValues(saved);
            setFieldErrors({});
          }}
        />

        {summary.length > 0 && (
          <ErrorSummary
            ref={summaryRef}
            title={t(summaryFor === 'publish' ? 'summary.publish' : 'summary.draft', {
              count: summary.length,
            })}
            errors={summary}
          />
        )}

        <EditFormLayout
          main={
            <>
              <BasicInfoSection onSlugEdited={() => setSlugTouched(true)} />
              <DatePlaceSection />
              <DescriptionSection />
              <ProgrammeSection />
              <PracticalSection />
              <TopicsSection topics={topics} onCreateTopic={createTopic} />
              <CoverSection />
              <GallerySection />
              <DocumentsSection />
              <AfterEventSection />
              {record && canDelete && (
                <FormSection id="s-danger" title={t('sections.danger')} tone="danger">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[13px] text-muted-ink">{t('fields.deleteText')}</p>
                    <Button variant="dangerOutline" size="sm" onClick={() => setDeleting(true)}>
                      {t('fields.deleteButton')}
                    </Button>
                  </div>
                </FormSection>
              )}
            </>
          }
          aside={
            <>
              <PublishingSection />
              <CategorySection types={types} />
              <ApplicationsSection />
              <SeoSection />
            </>
          }
        />
      </AdminPage>

      {record && (
        <ConfirmDeleteDialog
          open={deleting}
          onOpenChange={setDeleting}
          title={tEvents('delete.titleOne', { title: displayTitle })}
          description={t('fields.deleteText')}
          confirmLabel={tEvents('delete.confirmOne')}
          onConfirm={async () => {
            const result = await deleteEvents([record.id]);
            if (!result.ok) {
              toast.error(t(result.error === 'forbidden' ? 'toasts.forbidden' : 'toasts.unexpected'));
              return;
            }
            setDeleting(false);
            toast.success(t('toasts.deleted'));
            router.push('/admin/events');
          }}
        />
      )}
      <UnsavedChangesDialog
        open={guard.open}
        itemTitle={displayTitle}
        onStay={guard.stay}
        onDiscard={() => {
          setValues(saved);
          guard.leave();
        }}
        onSaveAndLeave={async () => {
          // A live event saves as "Update live page"; a draft stays a draft.
          if (await save(live ? 'publish' : 'draft')) guard.leave();
          else guard.stay();
        }}
      />
    </EventFormContext>
  );
}
