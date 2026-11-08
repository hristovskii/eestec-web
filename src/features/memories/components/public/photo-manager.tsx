'use client';

import { ImagePlus, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { SortableList } from '@/shared/admin-ui/sortable-list';
import { photoProblem, preparePhoto } from '@/shared/forms/photo-compress';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';

import { uploadMemoryPhoto } from '../../actions/memory-editor';
import { MEMORY_LIMITS, memoryPhotoSrc, PHOTO_MAX_BYTES } from '../../domain/memory-fields';
import type { MemoryCover, MemoryPhoto } from '../../types';

/** A picture in the editor: a stored file, or the striped placeholder of a sample photo. */
function Thumb({
  fileId,
  sample,
  alt,
  className,
}: {
  fileId: string | null;
  sample: string | null;
  alt: string;
  className?: string;
}) {
  if (fileId)
    // eslint-disable-next-line @next/next/no-img-element -- the member's own file from the photo store
    return <img src={memoryPhotoSrc(fileId)} alt={alt} className={cn('size-full object-cover', className)} />;
  return (
    <span className="flex size-full items-center justify-center bg-divider p-2 text-center text-[12px] leading-tight text-muted-ink">
      {sample ?? ''}
    </span>
  );
}

type Upload = { id: string; name: string; error: string | null };

/** Sends one picked file: checks it, makes it smaller, stores it. Resolves to the file id or an error key. */
async function sendPhoto(
  file: File,
): Promise<{ fileId: string } | { error: 'type' | 'big' | 'unreadable' | 'failed' }> {
  const problem = photoProblem(file);
  if (problem) return { error: problem };
  let prepared;
  try {
    prepared = await preparePhoto(file);
  } catch {
    return { error: 'unreadable' };
  }
  const form = new FormData();
  form.set('file', new File([prepared.blob], prepared.name, { type: 'image/jpeg' }));
  form.set('width', String(prepared.width));
  form.set('height', String(prepared.height));
  const result = await uploadMemoryPhoto(form).catch(() => null);
  return result?.ok ? { fileId: result.data.fileId } : { error: 'failed' };
}

/**
 * The Photos card of the editor (MemoryEditor): the cover with its alt text and credit, and the
 * gallery (reordered by dragging a handle, one alt text per photo). Photos are compressed in the
 * browser and uploaded one by one.
 */
export function PhotoManager({
  cover,
  photos,
  onCover,
  onPhotos,
  coverAltError,
  idPrefix,
}: {
  cover: MemoryCover | null;
  photos: MemoryPhoto[];
  onCover: (cover: MemoryCover | null) => void;
  onPhotos: (photos: MemoryPhoto[]) => void;
  coverAltError: boolean;
  idPrefix: string;
}) {
  const t = useTranslations('memories.editor');
  const [uploads, setUploads] = React.useState<Upload[]>([]);
  const coverInput = React.useRef<HTMLInputElement>(null);
  const galleryInput = React.useRef<HTMLInputElement>(null);
  // Uploads finish after the render that started them: read the newest lists, not the old ones.
  const latest = React.useRef({ cover, photos });
  React.useEffect(() => {
    latest.current = { cover, photos };
  });

  const problemText = (error: string) =>
    t(`errors.photo.${error as 'type' | 'big' | 'unreadable' | 'failed'}`);

  async function addCover(file: File) {
    const id = crypto.randomUUID();
    setUploads((list) => [...list, { id, name: file.name, error: null }]);
    const result = await sendPhoto(file);
    if ('fileId' in result) {
      const previous = latest.current.cover;
      onCover({
        fileId: result.fileId,
        sample: null,
        alt: previous?.alt ?? '',
        credit: previous?.credit ?? '',
      });
      setUploads((list) => list.filter((item) => item.id !== id));
    } else
      setUploads((list) => list.map((item) => (item.id === id ? { ...item, error: result.error } : item)));
  }

  async function addPhotos(files: File[]) {
    for (const file of files) {
      if (latest.current.photos.length >= MEMORY_LIMITS.photos) break;
      const id = crypto.randomUUID();
      setUploads((list) => [...list, { id, name: file.name, error: null }]);
      const result = await sendPhoto(file);
      if ('fileId' in result) {
        onPhotos([
          ...latest.current.photos,
          { id, fileId: result.fileId, sample: null, alt: '', caption: '' },
        ]);
        setUploads((list) => list.filter((item) => item.id !== id));
      } else
        setUploads((list) => list.map((item) => (item.id === id ? { ...item, error: result.error } : item)));
    }
  }

  const missing = photos.filter((photo) => !photo.alt.trim()).length;

  return (
    <div className="flex flex-col gap-8">
      <p className="text-small text-muted-ink">{t('photosIntro')}</p>

      <section aria-labelledby={`${idPrefix}-cover`} className="flex flex-col gap-3">
        <h3 id={`${idPrefix}-cover`} className="text-[16px] font-bold">
          {t('cover.label')}{' '}
          <span className="text-brand-dark" aria-hidden>
            *
          </span>
        </h3>
        {cover ? (
          <div className="grid gap-4 sm:grid-cols-[240px_minmax(0,1fr)]">
            <div className="relative aspect-video overflow-hidden rounded-md border border-line bg-divider">
              <Thumb fileId={cover.fileId} sample={cover.sample} alt="" />
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="quiet" size="sm" onClick={() => coverInput.current?.click()}>
                  {t('cover.replace')}
                </Button>
                <Button type="button" variant="quiet" size="sm" onClick={() => onCover(null)}>
                  <Trash2 aria-hidden />
                  {t('cover.remove')}
                </Button>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${idPrefix}-cover-alt`} className="text-small font-medium">
                  {t('cover.alt')}{' '}
                  <span className="text-brand-dark" aria-hidden>
                    *
                  </span>
                </label>
                <Input
                  id={`${idPrefix}-cover-alt`}
                  value={cover.alt}
                  maxLength={MEMORY_LIMITS.alt}
                  aria-invalid={coverAltError || undefined}
                  aria-describedby={`${idPrefix}-cover-alt-help`}
                  onChange={(event) => onCover({ ...cover, alt: event.target.value })}
                />
                <p
                  id={`${idPrefix}-cover-alt-help`}
                  className="flex justify-between gap-3 text-[13px] text-muted-ink"
                >
                  <span>{t('cover.altHelp')}</span>
                  <span>
                    {cover.alt.length} / {MEMORY_LIMITS.alt}
                  </span>
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${idPrefix}-cover-credit`} className="text-small font-medium">
                  {t('cover.credit')} <span className="font-normal text-muted-ink">· {t('optional')}</span>
                </label>
                <Input
                  id={`${idPrefix}-cover-credit`}
                  value={cover.credit}
                  maxLength={MEMORY_LIMITS.credit}
                  onChange={(event) => onCover({ ...cover, credit: event.target.value })}
                />
              </div>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() => coverInput.current?.click()}
          >
            <ImagePlus aria-hidden />
            {t('cover.pick')}
          </Button>
        )}
        <input
          ref={coverInput}
          id={`${idPrefix}-cover-file`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-label={t('cover.label')}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void addCover(file);
          }}
        />
      </section>

      <section aria-labelledby={`${idPrefix}-gallery`} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id={`${idPrefix}-gallery`} className="text-[16px] font-bold">
            {t('gallery.label')}
          </h3>
          <span className="text-small text-muted-ink">
            {t('gallery.count', { count: photos.length, max: MEMORY_LIMITS.photos })}
          </span>
        </div>

        <button
          type="button"
          onClick={() => galleryInput.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void addPhotos([...event.dataTransfer.files]);
          }}
          disabled={photos.length >= MEMORY_LIMITS.photos}
          className="flex w-full cursor-pointer flex-col items-center gap-1 rounded-md border-2 border-dashed border-line-strong bg-white px-4 py-7 text-center hover:border-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ImagePlus className="size-6 text-brand" aria-hidden />
          <span className="text-body">
            {t.rich('gallery.drop', { strong: (chunks) => <strong>{chunks}</strong> })}
          </span>
          <span className="text-small text-muted-ink">
            {t('gallery.dropHelp', { max: PHOTO_MAX_BYTES / 1024 / 1024 })}
          </span>
        </button>
        <input
          ref={galleryInput}
          id={`${idPrefix}-gallery-file`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label={t('gallery.add')}
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = '';
            void addPhotos(files);
          }}
        />

        {uploads.length > 0 && (
          <ul className="flex flex-col gap-2" aria-live="polite">
            {uploads.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-sm border px-3 py-2 text-small',
                  item.error ? 'border-brand bg-brand-tint text-brand-dark' : 'border-line bg-surface',
                )}
              >
                <span className="min-w-0 truncate">
                  {item.error
                    ? `${item.name}: ${problemText(item.error)}`
                    : t('gallery.uploading', { name: item.name })}
                </span>
                {item.error && (
                  <button
                    type="button"
                    aria-label={t('gallery.dismiss')}
                    className="shrink-0 rounded-sm p-1 hover:bg-white"
                    onClick={() => setUploads((list) => list.filter((upload) => upload.id !== item.id))}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {missing > 0 && (
          <p role="status" className="text-small font-medium text-brand-dark">
            {t('gallery.needAlt', { count: missing })}
          </p>
        )}

        {photos.length > 0 && (
          <SortableList
            items={photos}
            onReorder={onPhotos}
            label={t('gallery.label')}
            itemName={(photo) => photo.alt || t('gallery.photoNumber', { n: photos.indexOf(photo) + 1 })}
            layout="grid"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            renderItem={(photo, handle) => {
              const n = photos.indexOf(photo) + 1;
              const needsAlt = !photo.alt.trim();
              return (
                <div className="flex flex-col gap-2">
                  <div
                    className={cn(
                      'relative aspect-[4/3] overflow-hidden rounded-md border bg-divider',
                      needsAlt ? 'border-2 border-brand' : 'border-line',
                    )}
                  >
                    <Thumb fileId={photo.fileId} sample={photo.sample} alt="" />
                    <span
                      aria-hidden
                      className="absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-full bg-ink text-[12px] font-bold text-white"
                    >
                      {n}
                    </span>
                    <span className="absolute top-1 right-1 flex gap-1">
                      {handle}
                      <button
                        type="button"
                        aria-label={t('gallery.remove', { n })}
                        className="flex size-9 items-center justify-center rounded-sm bg-white/90 text-ink hover:text-brand-dark"
                        onClick={() => onPhotos(photos.filter((item) => item.id !== photo.id))}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </span>
                  </div>
                  <label htmlFor={`${idPrefix}-alt-${photo.id}`} className="sr-only">
                    {t('gallery.altFor', { n })}
                  </label>
                  <Input
                    id={`${idPrefix}-alt-${photo.id}`}
                    value={photo.alt}
                    maxLength={MEMORY_LIMITS.alt}
                    placeholder={t('gallery.altPlaceholder')}
                    aria-invalid={needsAlt || undefined}
                    className="h-10 text-small"
                    onChange={(event) =>
                      onPhotos(
                        photos.map((item) =>
                          item.id === photo.id ? { ...item, alt: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  {needsAlt && (
                    <p className="text-[13px] font-medium text-brand-dark">{t('gallery.altRequired')}</p>
                  )}
                </div>
              );
            }}
          />
        )}
      </section>
    </div>
  );
}
