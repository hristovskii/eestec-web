'use client';

import { ArrowDown, ArrowUp, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { AdminPage, AdminPageHeader } from '@/shared/admin-ui/admin-page';
import { UnsavedChangesDialog } from '@/shared/admin-ui/dialogs';
import { FormSection } from '@/shared/admin-ui/form-section';
import { RichTextEditor } from '@/shared/admin-ui/rich-text-editor';
import { useUnsavedChanges } from '@/shared/forms/use-unsaved-changes';
import { Checkbox, ChoiceLabel } from '@/shared/ui/form/choice';
import { FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { saveMemoryAsAdmin } from '../../actions/admin-memories';
import { MEMORY_LIMITS, memoryPhotoSrc } from '../../domain/memory-fields';
import type { MemoryContent, MemoryRecord } from '../../types';

const OTHER = '__other__';

/** The board's edit form (Admin › Memories › Edit, and "Edit before publishing" from Approvals). */
export function MemoryAdminForm({
  record,
  initial,
  events,
  authorName,
  canEdit,
}: {
  record: MemoryRecord;
  /** The content to edit: the waiting changes when there are some, otherwise the Memory itself. */
  initial: MemoryContent;
  events: { id: string; title: string }[];
  authorName: string;
  canEdit: boolean;
}) {
  const t = useTranslations('admin.memories.edit');
  const tStatus = useTranslations('admin.memories.status');
  const tToasts = useTranslations('admin.memories.toasts');
  const editingRevision = record.revision?.status === 'pending';
  const [saved, setSaved] = React.useState(initial);
  const [content, setContent] = React.useState(initial);
  const [featured, setFeatured] = React.useState(record.featuredOnHome);
  const [savedFeatured, setSavedFeatured] = React.useState(record.featuredOnHome);
  const [otherChosen, setOtherChosen] = React.useState(!initial.eventId && initial.otherEventName !== '');
  const [saving, setSaving] = React.useState(false);
  const dirty = JSON.stringify(content) !== JSON.stringify(saved) || featured !== savedFeatured;
  const leave = useUnsavedChanges(dirty);
  const set = (patch: Partial<MemoryContent>) => setContent((current) => ({ ...current, ...patch }));
  const eventValue = content.eventId ?? (otherChosen ? OTHER : '');

  async function save() {
    setSaving(true);
    const result = await saveMemoryAsAdmin({
      id: record.id,
      content,
      featuredOnHome: featured,
      revision: editingRevision,
    }).catch(() => null);
    setSaving(false);
    if (result?.ok) {
      setSaved(content);
      setSavedFeatured(featured);
      toast.success(tToasts('saved'));
    } else
      toast.error(
        result && !result.ok && result.error === 'forbidden' ? tToasts('forbidden') : tToasts('error'),
      );
  }

  function move(index: number, by: -1 | 1) {
    const photos = [...content.photos];
    const target = index + by;
    if (target < 0 || target >= photos.length) return;
    [photos[index], photos[target]] = [photos[target]!, photos[index]!];
    set({ photos });
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title={content.title || t('title')}
        description={t('statusLine', { status: tStatus(record.status), author: authorName })}
        actions={
          <Button asChild variant="quiet" size="sm">
            <Link href="/admin/memories">
              <ArrowLeft aria-hidden />
              {t('back')}
            </Link>
          </Button>
        }
      />
      {editingRevision && (
        <p role="status" className="rounded-md bg-surface px-4 py-3 text-small">
          {t('waitingNote')}
        </p>
      )}

      <div className="flex max-w-[900px] flex-col gap-5">
        <FormSection id="story" title={t('sections.story')}>
          <FormField
            id="am-title"
            label={t('fields.title')}
            required
            counter={`${content.title.length} / ${MEMORY_LIMITS.title}`}
          >
            {(control) => (
              <Input
                {...control}
                value={content.title}
                maxLength={MEMORY_LIMITS.title}
                disabled={!canEdit}
                onChange={(event) => set({ title: event.target.value })}
              />
            )}
          </FormField>
          <FormField id="am-event" label={t('fields.event')}>
            {(control) => (
              <NativeSelect
                {...control}
                value={eventValue}
                disabled={!canEdit}
                onChange={(event) => {
                  const value = event.target.value;
                  setOtherChosen(value === OTHER);
                  set({
                    eventId: value && value !== OTHER ? value : null,
                    otherEventName: value === OTHER ? content.otherEventName : '',
                  });
                }}
              >
                <NativeSelectOption value="">{t('fields.eventNone')}</NativeSelectOption>
                {events.map((event) => (
                  <NativeSelectOption key={event.id} value={event.id}>
                    {event.title}
                  </NativeSelectOption>
                ))}
                <NativeSelectOption value={OTHER}>{t('fields.otherName')}</NativeSelectOption>
              </NativeSelect>
            )}
          </FormField>
          {!content.eventId && eventValue === OTHER && (
            <FormField id="am-other" label={t('fields.otherName')}>
              {(control) => (
                <Input
                  {...control}
                  value={content.otherEventName}
                  maxLength={MEMORY_LIMITS.otherEvent}
                  disabled={!canEdit}
                  onChange={(event) => set({ otherEventName: event.target.value })}
                />
              )}
            </FormField>
          )}
          <div className="grid gap-4.5 sm:grid-cols-3">
            <FormField id="am-city" label={t('fields.city')}>
              {(control) => (
                <Input
                  {...control}
                  value={content.city}
                  maxLength={MEMORY_LIMITS.city}
                  disabled={!canEdit}
                  onChange={(event) => set({ city: event.target.value })}
                />
              )}
            </FormField>
            <FormField id="am-country" label={t('fields.country')}>
              {(control) => (
                <Input
                  {...control}
                  value={content.country}
                  maxLength={MEMORY_LIMITS.country}
                  disabled={!canEdit}
                  onChange={(event) => set({ country: event.target.value })}
                />
              )}
            </FormField>
            <FormField id="am-date" label={t('fields.date')}>
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  value={content.happenedOn ?? ''}
                  disabled={!canEdit}
                  onChange={(event) => set({ happenedOn: event.target.value || null })}
                />
              )}
            </FormField>
          </div>
          <div className="flex flex-col gap-1.5">
            <span id="am-text-label" className="text-small font-medium">
              {t('fields.text')}
            </span>
            <RichTextEditor
              id="am-text"
              labelledBy="am-text-label"
              value={content.body}
              onChange={(body) => set({ body })}
              minHeight={300}
            />
          </div>
        </FormSection>

        <FormSection id="photos" title={t('sections.photos')} aside={t('photosNote')}>
          <div className="flex flex-col gap-3">
            <strong className="text-small">{t('fields.cover')}</strong>
            {content.cover ? (
              <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
                <div className="relative aspect-video overflow-hidden rounded-sm border border-line bg-divider">
                  <Thumb fileId={content.cover.fileId} label={content.cover.sample} />
                </div>
                <div className="flex flex-col gap-3">
                  <FormField
                    id="am-cover-alt"
                    label={t('fields.coverAlt')}
                    counter={`${content.cover.alt.length} / ${MEMORY_LIMITS.alt}`}
                  >
                    {(control) => (
                      <Input
                        {...control}
                        value={content.cover?.alt ?? ''}
                        maxLength={MEMORY_LIMITS.alt}
                        disabled={!canEdit}
                        onChange={(event) =>
                          content.cover && set({ cover: { ...content.cover, alt: event.target.value } })
                        }
                      />
                    )}
                  </FormField>
                  <FormField id="am-cover-credit" label={t('fields.coverCredit')}>
                    {(control) => (
                      <Input
                        {...control}
                        value={content.cover?.credit ?? ''}
                        maxLength={MEMORY_LIMITS.credit}
                        disabled={!canEdit}
                        onChange={(event) =>
                          content.cover && set({ cover: { ...content.cover, credit: event.target.value } })
                        }
                      />
                    )}
                  </FormField>
                </div>
              </div>
            ) : (
              <p className="text-small text-muted-ink">—</p>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {content.photos.length === 0 && (
              <p className="text-small text-muted-ink">{t('fields.noPhotos')}</p>
            )}
            <ol className="flex flex-col gap-3">
              {content.photos.map((photo, index) => (
                <li
                  key={photo.id}
                  className="grid gap-3 rounded-md border border-line p-3 sm:grid-cols-[120px_minmax(0,1fr)_auto]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-divider">
                    <Thumb fileId={photo.fileId} label={photo.sample} />
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <label htmlFor={`am-alt-${photo.id}`} className="sr-only">
                      {t('fields.photoAlt', { n: index + 1 })}
                    </label>
                    <Input
                      id={`am-alt-${photo.id}`}
                      value={photo.alt}
                      maxLength={MEMORY_LIMITS.alt}
                      placeholder={t('fields.photoAlt', { n: index + 1 })}
                      aria-invalid={!photo.alt.trim() || undefined}
                      disabled={!canEdit}
                      onChange={(event) =>
                        set({
                          photos: content.photos.map((item) =>
                            item.id === photo.id ? { ...item, alt: event.target.value } : item,
                          ),
                        })
                      }
                    />
                    <label htmlFor={`am-cap-${photo.id}`} className="sr-only">
                      {t('fields.photoCaption', { n: index + 1 })}
                    </label>
                    <Input
                      id={`am-cap-${photo.id}`}
                      value={photo.caption}
                      maxLength={MEMORY_LIMITS.caption}
                      placeholder={t('fields.photoCaption', { n: index + 1 })}
                      disabled={!canEdit}
                      onChange={(event) =>
                        set({
                          photos: content.photos.map((item) =>
                            item.id === photo.id ? { ...item, caption: event.target.value } : item,
                          ),
                        })
                      }
                    />
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 sm:flex-col">
                      <Button
                        type="button"
                        variant="quiet"
                        size="sm"
                        aria-label={t('moveUp', { n: index + 1 })}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="quiet"
                        size="sm"
                        aria-label={t('moveDown', { n: index + 1 })}
                        disabled={index === content.photos.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="dangerOutline"
                        size="sm"
                        aria-label={t('fields.photoRemove', { n: index + 1 })}
                        onClick={() => set({ photos: content.photos.filter((item) => item.id !== photo.id) })}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </FormSection>

        {record.status === 'published' && (
          <FormSection id="home" title={t('sections.home')}>
            <ChoiceLabel
              control={
                <Checkbox
                  id="am-feature"
                  checked={featured}
                  disabled={!canEdit}
                  onChange={(event) => setFeatured(event.target.checked)}
                />
              }
            >
              <span>
                {t('fields.feature')}
                <span className="block text-[13px] text-muted-ink">{t('fields.featureHelp')}</span>
              </span>
            </ChoiceLabel>
          </FormSection>
        )}

        {canEdit && (
          <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 border-t border-line bg-white px-1 py-3">
            <span role="status" className="text-small text-muted-ink">
              {dirty ? t('unsaved') : ''}
            </span>
            <div className="flex gap-2.5">
              <Button
                type="button"
                variant="quiet"
                size="sm"
                disabled={!dirty || saving}
                onClick={() => {
                  setContent(saved);
                  setFeatured(savedFeatured);
                  setOtherChosen(!saved.eventId && saved.otherEventName !== '');
                }}
              >
                {t('discard')}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!dirty || saving}
                aria-busy={saving || undefined}
                onClick={() => void save()}
              >
                {saving ? t('saving') : t('save')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <UnsavedChangesDialog
        open={leave.open}
        itemTitle={content.title}
        onStay={leave.stay}
        onDiscard={leave.leave}
        onSaveAndLeave={async () => {
          await save();
          leave.leave();
        }}
      />
    </AdminPage>
  );
}

function Thumb({ fileId, label }: { fileId: string | null; label: string | null }) {
  if (fileId)
    // eslint-disable-next-line @next/next/no-img-element -- a member's file from the photo store
    return <img src={memoryPhotoSrc(fileId)} alt="" className="size-full object-cover" />;
  return (
    <span className="flex size-full items-center justify-center p-2 text-center text-[12px] leading-tight text-muted-ink">
      {label ?? ''}
    </span>
  );
}
