'use client';

import { CircleAlert, ImageIcon, Library, Trash2, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { formatBytes, IMAGE_TYPES, type MediaItem } from '@/features/media';
import { MediaPicker, MediaThumb, uploadMediaFile } from '@/features/media/admin';
import { AdminDialog } from '@/shared/admin-ui/dialogs';
import { FormSection } from '@/shared/admin-ui/form-section';
import { SortableList } from '@/shared/admin-ui/sortable-list';
import { formatDate } from '@/shared/i18n/format';
import { cn } from '@/shared/lib/cn';
import { FieldError, FormField } from '@/shared/ui/form/form-field';
import { MediaImage } from '@/shared/ui/media-image';
import { Notice } from '@/shared/ui/notice';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { Textarea } from '@/shared/ui/primitives/textarea';

import { EVENT_LIMITS, VIDEO_URL } from '../../../schemas/event.schema';
import { useEventForm } from './form-kit';
import { OptionalLabel } from './main-sections';

const PHOTO_TYPES = IMAGE_TYPES.filter((type) => type !== 'image/svg+xml' && type !== 'image/gif');

/** "cover-ai-edge.jpg · 1920 × 1200 · 284 KB" */
function fileLine(item: MediaItem) {
  return [
    item.fileName,
    item.width && item.height ? `${item.width} × ${item.height}` : null,
    formatBytes(item.size),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Errors from uploads are admin.media.errors keys. */
function useUploadError() {
  const t = useTranslations('admin.media.errors');
  return (key: string) =>
    t((['type', 'size', 'empty', 'forbidden', 'cancelled'].includes(key) ? key : 'unexpected') as 'type');
}

/** A hidden file input opened by a button (uploads straight from the form). */
function useFilePicker(accept: readonly string[], multiple: boolean, onFiles: (files: File[]) => void) {
  const ref = React.useRef<HTMLInputElement>(null);
  return {
    open: () => ref.current?.click(),
    input: (
      <input
        ref={ref}
        type="file"
        tabIndex={-1}
        aria-hidden
        className="hidden"
        multiple={multiple}
        accept={accept.join(',')}
        onChange={(event) => {
          if (event.target.files?.length) onFiles([...event.target.files]);
          event.target.value = '';
        }}
      />
    ),
  };
}

// ─── Cover image ───

export function CoverSection() {
  const t = useTranslations('admin.events.edit');
  const { values, update, error, media, addMedia, fieldId } = useEventForm();
  const uploadError = useUploadError();
  const [picking, setPicking] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const cover = values.cover;
  const item = cover ? media[cover.mediaId] : undefined;

  const use = (picked: MediaItem) => {
    addMedia([picked]);
    update((draft) => {
      // Keep text already written for this event; otherwise start from the library's alt text.
      draft.cover = {
        mediaId: picked.id,
        alt: picked.alt || draft.cover?.alt || null,
        ...(picked.credit || draft.cover?.credit ? { credit: picked.credit || draft.cover?.credit } : {}),
      };
    });
  };
  const files = useFilePicker(PHOTO_TYPES, false, ([file]) => {
    if (!file) return;
    setUploading(true);
    void uploadMediaFile(file, { altLater: true }).then((result) => {
      setUploading(false);
      if (result.ok) use(result.item);
      else toast.error(uploadError(result.error));
    });
  });

  return (
    <FormSection id="s-cover" title={t('sections.cover')} aside={t('sections.coverAside')}>
      <div className="grid items-start gap-5 md:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          <div
            id={fieldId('cover')}
            tabIndex={-1}
            className="relative aspect-[16/10] overflow-hidden rounded-md border border-line outline-none"
          >
            {item ? <MediaThumb item={item} sizes="300px" /> : <MediaImage media={null} preset="card" />}
            {cover ? (
              <>
                <span className="absolute bottom-2 left-2 flex gap-1.5">
                  <Button
                    size="sm"
                    variant="quiet"
                    className="h-7.5 bg-white/95 px-2.5 text-[13px]"
                    onClick={() => setPicking(true)}
                  >
                    {t('fields.coverReplace')}
                  </Button>
                </span>
                <Button
                  size="icon"
                  variant="quiet"
                  aria-label={t('fields.coverRemove')}
                  className="absolute top-2 right-2 size-7.5 bg-white/95"
                  onClick={() => update((draft) => void (draft.cover = null))}
                >
                  <X aria-hidden />
                </Button>
              </>
            ) : (
              <span className="absolute bottom-2 left-2 rounded-full bg-ink/80 px-2.5 py-1 text-[12px] font-medium text-white">
                {t('fields.coverFallback')}
              </span>
            )}
          </div>
          {item && <span className="text-[13px] text-muted-ink">{fileLine(item)}</span>}
        </div>

        {cover ? (
          <div className="flex flex-col gap-3.5">
            <FormField
              id={fieldId('cover.alt')}
              label={t('fields.coverAlt')}
              required
              help={t('fields.coverAltHelp')}
              counter={`${(cover.alt ?? '').length} / ${EVENT_LIMITS.alt}`}
              error={error('cover.alt')}
            >
              {(control) => (
                <Textarea
                  {...control}
                  rows={3}
                  value={cover.alt ?? ''}
                  onChange={(event) =>
                    update((draft) => void (draft.cover!.alt = event.target.value || null))
                  }
                  className="min-h-0 md:text-small"
                />
              )}
            </FormField>
            <FormField
              id={fieldId('cover.credit')}
              label={<OptionalLabel>{t('fields.credit')}</OptionalLabel>}
              error={error('cover.credit')}
            >
              {(control) => (
                <Input
                  {...control}
                  value={cover.credit ?? ''}
                  placeholder={t('fields.creditPlaceholder')}
                  onChange={(event) =>
                    update((draft) => {
                      const credit = event.target.value;
                      draft.cover = { ...draft.cover!, ...(credit ? { credit } : { credit: undefined }) };
                    })
                  }
                  className="md:text-small"
                />
              )}
            </FormField>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {/* D21: allowed, but say so. */}
            <Notice tone="info">{t('fields.coverMissing')}</Notice>
            <div className="flex flex-wrap gap-2">
              <Button variant="quiet" size="sm" onClick={() => setPicking(true)}>
                <Library aria-hidden />
                {t('fields.coverChoose')}
              </Button>
              <Button
                variant="quiet"
                size="sm"
                onClick={files.open}
                disabled={uploading}
                aria-busy={uploading || undefined}
              >
                <Upload aria-hidden />
                {t('fields.coverUpload')}
              </Button>
              {files.input}
            </div>
          </div>
        )}
      </div>
      <MediaPicker
        open={picking}
        onOpenChange={setPicking}
        onPick={use}
        currentId={cover?.mediaId}
        requireAlt={false}
        allowSamples
      />
    </FormSection>
  );
}

// ─── Photo gallery ───

type Upload = { key: string; name: string; percent: number; controller: AbortController; error?: string };

export function GallerySection() {
  const t = useTranslations('admin.events.edit');
  const { values, update, error, media, addMedia, fieldId } = useEventForm();
  const uploadError = useUploadError();
  const [uploads, setUploads] = React.useState<Upload[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  const [editing, setEditing] = React.useState<number | null>(null);

  const patch = (key: string, next: Partial<Upload>) =>
    setUploads((list) => list.map((upload) => (upload.key === key ? { ...upload, ...next } : upload)));
  const add = (items: MediaItem[]) => {
    addMedia(items);
    update((draft) => {
      for (const item of items)
        if (!draft.gallery.some((photo) => photo.mediaId === item.id))
          draft.gallery.push({ mediaId: item.id, alt: item.alt || null });
    });
  };

  const start = (files: File[]) => {
    const started = files.map((file) => ({
      file,
      upload: { key: crypto.randomUUID(), name: file.name, percent: 0, controller: new AbortController() },
    }));
    setUploads((list) => [...list, ...started.map((entry) => entry.upload)]);
    void Promise.all(
      started.map(async ({ file, upload }) => {
        const result = await uploadMediaFile(file, {
          altLater: true,
          signal: upload.controller.signal,
          onProgress: (percent) => patch(upload.key, { percent }),
        });
        if (result.ok) {
          add([result.item]);
          setUploads((list) => list.filter((other) => other.key !== upload.key));
          return true;
        }
        if (result.error === 'cancelled')
          setUploads((list) => list.filter((other) => other.key !== upload.key));
        else patch(upload.key, { error: uploadError(result.error) });
        return false;
      }),
    ).then((done) => {
      const count = done.filter(Boolean).length;
      if (count > 0) toast.success(t('toasts.uploaded', { count }));
    });
  };
  const files = useFilePicker(PHOTO_TYPES, true, start);
  const items = values.gallery.map((photo) => ({ ...photo, id: photo.mediaId }));

  return (
    <FormSection
      id="s-gallery"
      title={t('sections.gallery')}
      aside={t('sections.galleryAside', { count: values.gallery.length })}
    >
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          start([...event.dataTransfer.files]);
        }}
        className={cn(
          'flex flex-wrap items-center justify-center gap-3.5 rounded-md border-[1.5px] border-dashed px-5 py-5.5',
          dragging ? 'border-brand bg-brand-tint' : 'border-line-input bg-surface-2',
        )}
      >
        <span
          aria-hidden
          className="flex size-11 items-center justify-center rounded-md border border-line bg-white text-brand"
        >
          <Upload className="size-5" />
        </span>
        <span className="flex flex-col text-small">
          <span>
            {t.rich('fields.galleryDrop', {
              strong: (chunks) => <strong>{chunks}</strong>,
              browse: (chunks) => (
                <button
                  type="button"
                  onClick={files.open}
                  className="cursor-pointer font-medium text-brand-dark hover:underline focus-visible:outline-2 focus-visible:outline-brand"
                >
                  {chunks}
                </button>
              ),
            })}
          </span>
          <span className="text-[13px] text-muted-ink">{t('fields.galleryTypes')}</span>
        </span>
        <Button variant="ghost" size="sm" onClick={() => setPicking(true)}>
          <Library aria-hidden />
          {t('fields.galleryLibrary')}
        </Button>
        {files.input}
      </div>

      {uploads.length > 0 && (
        <ul className="flex flex-col gap-2">
          {uploads.map((upload) => (
            <li
              key={upload.key}
              className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-sm border border-divider px-3 py-2"
            >
              <span
                aria-hidden
                className="flex h-7.5 w-10 items-center justify-center rounded-[4px] bg-surface text-muted-ink"
              >
                <ImageIcon className="size-4" />
              </span>
              <span className="flex min-w-0 flex-col gap-1.5">
                <span className="flex justify-between gap-2 text-[13px]">
                  <span className="truncate">{upload.name}</span>
                  {!upload.error && <span className="text-muted-ink tabular-nums">{upload.percent}%</span>}
                </span>
                {upload.error ? (
                  <FieldError>
                    {t('fields.galleryFailed', { name: upload.name, error: upload.error })}
                  </FieldError>
                ) : (
                  <span
                    role="progressbar"
                    aria-label={upload.name}
                    aria-valuenow={upload.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="block h-1 overflow-hidden rounded-full bg-divider"
                  >
                    <span
                      className="block h-full bg-ink transition-[width]"
                      style={{ width: `${upload.percent}%` }}
                    />
                  </span>
                )}
              </span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('fields.galleryCancel', { name: upload.name })}
                onClick={() =>
                  upload.error
                    ? setUploads((list) => list.filter((other) => other.key !== upload.key))
                    : upload.controller.abort()
                }
              >
                {upload.error ? <X aria-hidden /> : t('fields.galleryCancelShort')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <SortableList
          layout="grid"
          items={items}
          onReorder={(next) =>
            update((draft) => void (draft.gallery = next.map(({ id: _id, ...photo }) => photo)))
          }
          label={t('sections.gallery')}
          itemName={(photo) => t('fields.galleryMove', { number: items.indexOf(photo) + 1 })}
          className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-4"
          renderItem={(photo, handle) => {
            const index = items.indexOf(photo);
            const item = media[photo.mediaId];
            const altError = error(`gallery.${index}.alt`) ?? error(`gallery.${index}`);
            return (
              <div className="flex flex-col gap-1.5">
                <div
                  className={cn(
                    'relative aspect-[4/3] overflow-hidden rounded-sm border',
                    altError ? 'border-2 border-brand' : 'border-line',
                  )}
                >
                  {item ? (
                    <MediaThumb item={item} decorative sizes="200px" />
                  ) : (
                    <span className="absolute inset-0 bg-surface" />
                  )}
                  <span className="absolute top-1.5 left-1.5 rounded-sm bg-white/95">{handle}</span>
                  <span className="absolute top-1.5 right-1.5 flex h-5.5 min-w-5.5 items-center justify-center rounded-full bg-ink px-1.5 text-[12px] font-bold text-white">
                    {index + 1}
                  </span>
                </div>
                <button
                  id={fieldId(`gallery.${index}.alt`)}
                  type="button"
                  onClick={() => setEditing(index)}
                  aria-label={photo.alt ? t('fields.galleryEditAlt', { number: index + 1 }) : undefined}
                  className={cn(
                    'flex min-w-0 cursor-pointer items-center gap-1 text-left text-[13px] focus-visible:outline-2 focus-visible:outline-brand',
                    photo.alt ? 'text-ink hover:underline' : 'font-medium text-brand-dark',
                  )}
                >
                  {photo.alt ? (
                    <span className="truncate">{photo.alt}</span>
                  ) : (
                    <>
                      <CircleAlert className="size-3.5 shrink-0" aria-hidden />
                      {t('fields.galleryAddAlt')}
                      <span className="sr-only"> ({t('fields.galleryPhoto', { number: index + 1 })})</span>
                    </>
                  )}
                </button>
              </div>
            );
          }}
        />
      )}

      <GalleryAltDialog index={editing} onClose={() => setEditing(null)} />
      <MediaPicker
        open={picking}
        onOpenChange={setPicking}
        onPick={(item) => add([item])}
        requireAlt={false}
        allowSamples
      />
    </FormSection>
  );
}

function GalleryAltDialog({ index, onClose }: { index: number | null; onClose: () => void }) {
  const t = useTranslations('admin.events.edit.fields');
  const tDialogs = useTranslations('admin.ui.dialogs');
  const { values, update, media } = useEventForm();
  const photo = index === null ? null : values.gallery[index];
  const [alt, setAlt] = React.useState('');
  const [lastIndex, setLastIndex] = React.useState(index);
  if (index !== lastIndex) {
    setLastIndex(index);
    setAlt(photo?.alt ?? '');
  }
  const formId = React.useId();
  const item = photo ? media[photo.mediaId] : undefined;

  return (
    <AdminDialog
      open={photo !== null && photo !== undefined}
      onOpenChange={(open) => !open && onClose()}
      title={index !== null ? t('galleryAltTitle', { number: index + 1 }) : ''}
      description={item?.fileName}
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            className="text-brand-dark sm:mr-auto"
            onClick={() => {
              update((draft) => void draft.gallery.splice(index!, 1));
              onClose();
            }}
          >
            <Trash2 aria-hidden />
            {t('galleryRemove', { number: (index ?? 0) + 1 })}
          </Button>
          <Button variant="quiet" size="sm" onClick={onClose}>
            {tDialogs('cancel')}
          </Button>
          <Button type="submit" form={formId} size="sm">
            {t('galleryAltSave')}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          update((draft) => void (draft.gallery[index!]!.alt = alt.trim() || null));
          onClose();
        }}
        className="flex flex-col gap-3"
      >
        {item && (
          <span className="relative block aspect-[4/3] w-40 overflow-hidden rounded-sm border border-line">
            <MediaThumb item={item} decorative sizes="160px" />
          </span>
        )}
        <FormField
          id={`${formId}-alt`}
          label={t('coverAlt')}
          required
          help={t('coverAltHelp')}
          counter={`${alt.length} / ${EVENT_LIMITS.alt}`}
        >
          {(control) => (
            <Textarea
              {...control}
              autoFocus
              rows={3}
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              className="min-h-0 md:text-small"
            />
          )}
        </FormField>
      </form>
    </AdminDialog>
  );
}

// ─── Documents & video ───

export function DocumentsSection() {
  const t = useTranslations('admin.events.edit');
  const { values, update, error, media, addMedia, fieldId } = useEventForm();
  const [picking, setPicking] = React.useState(false);
  const pack = values.infoPackId ? media[values.infoPackId] : undefined;
  const videoInvalid = values.videoUrl !== '' && !VIDEO_URL.test(values.videoUrl);

  return (
    <FormSection id="s-docs" title={t('sections.documents')}>
      <div className="flex flex-col">
        <span id={`${fieldId('infoPackId')}-label`} className="mb-1.5 text-small font-medium">
          <OptionalLabel>{t('fields.infoPack')}</OptionalLabel>
        </span>
        {pack ? (
          <div
            id={fieldId('infoPackId')}
            className="flex flex-wrap items-center gap-3 rounded-sm border border-line px-3 py-2.5"
          >
            <span
              aria-hidden
              className="flex h-10 w-8 items-end justify-center rounded-[4px] bg-brand-tint pb-1 text-[11px] font-bold text-brand-dark"
            >
              PDF
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <strong className="truncate font-medium">{pack.fileName}</strong>
              <span className="text-[13px] text-muted-ink">
                {t('fields.infoPackMeta', {
                  size: formatBytes(pack.size),
                  date: formatDate(pack.uploadedAt, 'en', 'dayMonth'),
                  name: pack.uploadedBy.name,
                })}
              </span>
            </span>
            <Button variant="quiet" size="sm" onClick={() => setPicking(true)}>
              {t('fields.infoPackReplace')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-brand-dark"
              onClick={() => update((draft) => void (draft.infoPackId = null))}
            >
              {t('fields.infoPackRemove')}
            </Button>
          </div>
        ) : (
          <Button
            id={fieldId('infoPackId')}
            variant="quiet"
            size="sm"
            className="w-fit"
            aria-describedby={`${fieldId('infoPackId')}-label`}
            onClick={() => setPicking(true)}
          >
            {t('fields.infoPackChoose')}
          </Button>
        )}
        {error('infoPackId') && <FieldError>{error('infoPackId')}</FieldError>}
        <span className="mt-1.5 text-small text-muted-ink">{t('fields.infoPackHelp')}</span>
      </div>
      <FormField
        id={fieldId('videoUrl')}
        label={<OptionalLabel>{t('fields.video')}</OptionalLabel>}
        help={t('fields.videoHelp')}
        error={error('videoUrl') ?? (videoInvalid ? t('errors.videoUrl') : undefined)}
      >
        {(control) => (
          <Input
            {...control}
            type="url"
            value={values.videoUrl}
            placeholder={t('fields.videoPlaceholder')}
            onChange={(event) => update((draft) => void (draft.videoUrl = event.target.value.trim()))}
            className="md:text-small"
          />
        )}
      </FormField>
      <MediaPicker
        open={picking}
        onOpenChange={setPicking}
        kind="document"
        currentId={values.infoPackId}
        allowSamples
        onPick={(item) => {
          addMedia([item]);
          update((draft) => void (draft.infoPackId = item.id));
        }}
      />
    </FormSection>
  );
}
