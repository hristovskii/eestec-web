'use client';

import { CircleAlert, CircleCheck, FileText, LoaderCircle, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { AdminDialog } from '@/shared/admin-ui/dialogs';
import { cn } from '@/shared/lib/cn';
import { Checkbox, ChoiceLabel } from '@/shared/ui/form/choice';
import { FieldError } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';

import { finishMediaUpload, startMediaUpload } from '../../actions/media';
import { errorText } from './error-text';
import {
  ACCEPTED_TYPES,
  formatBytes,
  kindOf,
  type UploadProblem,
  uploadProblem,
} from '../../domain/upload-rules';

type Status = 'waiting' | 'uploading' | 'done' | 'failed';

type Entry = {
  key: string;
  file: File;
  isImage: boolean;
  previewUrl: string | null;
  problem: UploadProblem | null;
  width?: number;
  height?: number;
  alt: string;
  decorative: boolean;
  credit: string;
  status: Status;
  error?: string;
};

/** Natural size of an image file (SVGs without a size report 0 and are skipped). */
const readDimensions = (url: string) =>
  new Promise<{ width?: number; height?: number }>((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve(image.naturalWidth ? { width: image.naturalWidth, height: image.naturalHeight } : {});
    image.onerror = () => resolve({});
    image.src = url;
  });

/**
 * Upload several files at once. Every image needs alt text (or "decorative") before the upload
 * starts (decided rule). Each file: reserve (Server Action) → PUT the bytes → confirm with alt text.
 */
export function UploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('admin.media');
  const tDialogs = useTranslations('admin.ui.dialogs');
  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputId = React.useId();

  const patch = (key: string, next: Partial<Entry>) =>
    setEntries((list) => list.map((entry) => (entry.key === key ? { ...entry, ...next } : entry)));

  const add = (files: FileList | File[]) => {
    const added = [...files].map((file): Entry => {
      const isImage = kindOf(file.type) === 'image';
      const problem = uploadProblem(file);
      return {
        key: crypto.randomUUID(),
        file,
        isImage,
        previewUrl: isImage && !problem ? URL.createObjectURL(file) : null,
        problem,
        alt: '',
        decorative: false,
        credit: '',
        status: 'waiting',
      };
    });
    setEntries((list) => [...list, ...added]);
    for (const entry of added) {
      if (entry.previewUrl) void readDimensions(entry.previewUrl).then((size) => patch(entry.key, size));
    }
  };

  const release = (list: Entry[]) =>
    list.forEach((entry) => entry.previewUrl && URL.revokeObjectURL(entry.previewUrl));

  const close = (next: boolean) => {
    if (busy) return;
    if (!next) {
      release(entries);
      setEntries([]);
    }
    onOpenChange(next);
  };

  const ready = entries.filter((entry) => !entry.problem && entry.status !== 'done');
  const missingAlt = ready.filter((entry) => entry.isImage && !entry.decorative && !entry.alt.trim()).length;

  const upload = async () => {
    setBusy(true);
    let uploaded = 0;
    for (const entry of ready) {
      patch(entry.key, { status: 'uploading', error: undefined });
      const fail = (key: string | undefined) =>
        patch(entry.key, { status: 'failed', error: errorText(t, key) });
      const start = await startMediaUpload({
        fileName: entry.file.name,
        mimeType: entry.file.type,
        size: entry.file.size,
      });
      if (!start.ok) {
        fail(start.error === 'validation' ? Object.values(start.fieldErrors)[0]?.[0] : start.error);
        continue;
      }
      const put = await fetch(start.data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': entry.file.type },
        body: entry.file,
      }).catch(() => null);
      if (!put?.ok) {
        fail('unexpected');
        continue;
      }
      const finish = await finishMediaUpload({
        uploadId: start.data.uploadId,
        alt: entry.alt,
        decorative: entry.decorative,
        credit: entry.credit,
        width: entry.width,
        height: entry.height,
      });
      if (!finish.ok) {
        fail(finish.error === 'validation' ? finish.fieldErrors.alt?.[0] : finish.error);
        continue;
      }
      uploaded += 1;
      patch(entry.key, { status: 'done' });
    }
    setBusy(false);
    if (uploaded > 0) toast.success(t('uploadDialog.done', { count: uploaded }));
    // Everything went up: close. Failures stay in the list with their error.
    if (uploaded === ready.length) {
      release(entries);
      setEntries([]);
      onOpenChange(false);
    }
  };

  return (
    <AdminDialog
      open={open}
      onOpenChange={close}
      size="lg"
      title={t('uploadDialog.title')}
      description={t('uploadDialog.text')}
      footer={
        <>
          {missingAlt > 0 && (
            <span role="status" className="mr-auto self-center text-[13px] text-muted-ink">
              {t('uploadDialog.needsAlt', { count: missingAlt })}
            </span>
          )}
          <Button variant="quiet" size="sm" onClick={() => close(false)} disabled={busy}>
            {tDialogs('cancel')}
          </Button>
          <Button
            size="sm"
            onClick={() => void upload()}
            disabled={busy || ready.length === 0 || missingAlt > 0}
            aria-busy={busy || undefined}
          >
            {busy ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden />
                {t('uploadDialog.uploading')}
              </>
            ) : (
              <>
                <Upload aria-hidden />
                {t('uploadDialog.submit', { count: ready.length })}
              </>
            )}
          </Button>
        </>
      }
    >
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          add(event.dataTransfer.files);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 rounded-md border-[1.5px] border-dashed px-4 text-center',
          entries.length ? 'py-4' : 'py-10',
          'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand',
          dragging ? 'border-brand bg-brand-tint' : 'border-line-input hover:border-ink',
        )}
      >
        <Upload className="size-6 text-muted-ink" aria-hidden />
        <span className="font-medium">
          {entries.length ? t('uploadDialog.chooseMore') : t('uploadDialog.choose')}
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            if (event.target.files) add(event.target.files);
            event.target.value = '';
          }}
        />
      </label>

      {entries.length > 0 && (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <UploadRow
              key={entry.key}
              entry={entry}
              busy={busy}
              onChange={(next) => patch(entry.key, next)}
              onRemove={() => {
                release([entry]);
                setEntries((list) => list.filter((other) => other.key !== entry.key));
              }}
            />
          ))}
        </ul>
      )}
    </AdminDialog>
  );
}

function UploadRow({
  entry,
  busy,
  onChange,
  onRemove,
}: {
  entry: Entry;
  busy: boolean;
  onChange: (next: Partial<Entry>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('admin.media');
  const id = `upload-${entry.key}`;
  const locked = busy || entry.status === 'done';
  const statusIcon = {
    waiting: null,
    uploading: <LoaderCircle className="size-4 animate-spin" aria-hidden />,
    done: <CircleCheck className="size-4" aria-hidden />,
    failed: <CircleAlert className="size-4 text-brand-dark" aria-hidden />,
  }[entry.status];

  return (
    <li className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-md border border-line p-3">
      <span className="relative flex size-16 items-center justify-center overflow-hidden rounded-sm bg-surface text-muted-ink">
        {entry.previewUrl ? (
          // A local blob: preview, not a site image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.previewUrl} alt="" className="size-full object-cover" />
        ) : (
          <FileText className="size-7" strokeWidth={1.5} aria-hidden />
        )}
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{entry.file.name}</span>
            <span className="flex items-center gap-1.5 text-[13px] text-muted-ink">
              {formatBytes(entry.file.size)}
              {!entry.problem && (
                <>
                  {' · '}
                  {statusIcon}
                  {t(`uploadDialog.status.${entry.status}`)}
                </>
              )}
            </span>
          </div>
          {entry.status !== 'done' && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onRemove}
              disabled={busy}
              aria-label={t('uploadDialog.remove', { name: entry.file.name })}
            >
              <X aria-hidden />
            </Button>
          )}
        </div>
        {entry.problem && <FieldError>{t(`errors.${entry.problem}`)}</FieldError>}
        {entry.error && <FieldError>{entry.error}</FieldError>}
        {!entry.problem && entry.isImage && (
          <>
            <label htmlFor={`${id}-alt`} className="sr-only">
              {t('details.alt')} ({entry.file.name})
            </label>
            <Input
              id={`${id}-alt`}
              placeholder={t('details.alt')}
              value={entry.decorative ? '' : entry.alt}
              disabled={locked || entry.decorative}
              aria-describedby={`${id}-alt-help`}
              onChange={(event) => onChange({ alt: event.target.value })}
              className="md:text-small"
            />
            <span id={`${id}-alt-help`} className="sr-only">
              {t('details.altHelp')}
            </span>
            <ChoiceLabel
              control={
                <Checkbox
                  checked={entry.decorative}
                  disabled={locked}
                  onChange={(event) => onChange({ decorative: event.target.checked })}
                />
              }
              className="text-[13px]"
            >
              {t('details.decorative')}
            </ChoiceLabel>
          </>
        )}
      </div>
    </li>
  );
}
