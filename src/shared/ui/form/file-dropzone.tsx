'use client';

import { Paperclip, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

import { FieldError } from './form-field';

type FileDropzoneProps = {
  id: string;
  name: string;
  label: React.ReactNode;
  /** e.g. "application/pdf" */
  accept?: string;
  help?: React.ReactNode;
  error?: string;
  optional?: boolean;
  onFileChange?: (file: File | null) => void;
};

const formatSize = (bytes: number) =>
  bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;

/** "Upload a file or drag it here" (Main › Form fields). A real file input: works with keyboard and forms. */
export function FileDropzone({
  id,
  name,
  label,
  accept,
  help,
  error,
  optional,
  onFileChange,
}: FileDropzoneProps) {
  const t = useTranslations('ui.form');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);

  const choose = (next: File | null) => {
    setFile(next);
    onFileChange?.(next);
  };

  const remove = () => {
    if (inputRef.current) inputRef.current.value = '';
    choose(null);
  };

  return (
    <div className="flex flex-col">
      <span className="mb-1.5 block text-small font-medium text-ink">
        {label}
        {optional && <span className="font-normal text-muted-ink"> · {t('optional')}</span>}
      </span>
      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const dropped = event.dataTransfer.files[0];
          if (dropped && inputRef.current) {
            const transfer = new DataTransfer();
            transfer.items.add(dropped);
            inputRef.current.files = transfer.files;
            choose(dropped);
          }
        }}
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-sm border-[1.5px] border-dashed p-3.5',
          'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand',
          error ? 'border-brand' : dragging ? 'border-brand bg-brand-tint' : 'border-line-input',
        )}
      >
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-surface text-brand"
        >
          {file ? <Paperclip className="size-5" /> : <Upload className="size-5" />}
        </span>
        <span className="text-small">
          {file ? (
            <>
              <strong>{file.name}</strong> <span className="text-muted-ink">· {formatSize(file.size)}</span>
            </>
          ) : (
            t.rich('upload', { strong: (chunks) => <strong className="text-brand-dark">{chunks}</strong> })
          )}
        </span>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="file"
          accept={accept}
          className="sr-only"
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [error && `${id}-error`, help && `${id}-help`].filter(Boolean).join(' ') || undefined
          }
          onChange={(event) => choose(event.target.files?.[0] ?? null)}
        />
      </label>
      {file && (
        <button
          type="button"
          onClick={remove}
          className="mt-1.5 inline-flex w-fit cursor-pointer items-center gap-1 text-small font-medium text-brand-dark hover:underline"
        >
          <X className="size-4" aria-hidden />
          {t('removeFile')}
        </button>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      {help && (
        <span id={`${id}-help`} className="mt-1.5 text-small text-muted-ink">
          {help}
        </span>
      )}
    </div>
  );
}
