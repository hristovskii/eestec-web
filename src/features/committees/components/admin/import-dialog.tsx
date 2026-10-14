'use client';

import { CircleAlert, FileUp, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { AdminDialog } from '@/shared/admin-ui/dialogs';
import { parseCsv } from '@/shared/lib/csv-parse';
import { Button } from '@/shared/ui/primitives/button';

import { importCommittees } from '../../actions/admin-committees';
import { IMPORT_HEADER, type ImportPreview, previewCommitteeImport } from '../../domain/committee-import';

const TEMPLATE = `data:text/csv;charset=utf-8,${encodeURIComponent(
  `${IMPORT_HEADER.join(',')}\r\nLC Example,LC,Example City,Serbia,44.82,20.46,https://example.org\r\n`,
)}`;

/** Import CSV: checks the file here first, lists the rows that failed, and imports the rest. */
export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('admin.committees');
  const [file, setFile] = React.useState<{ name: string; preview: ImportPreview } | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [failedToRead, setFailedToRead] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const id = React.useId();

  const close = (next: boolean) => {
    if (pending) return;
    if (!next) {
      setFile(null);
      setFailedToRead(false);
    }
    onOpenChange(next);
  };

  const choose = async (chosen: File | undefined) => {
    if (!chosen) return;
    try {
      const text = await chosen.text();
      setFile({ name: chosen.name, preview: previewCommitteeImport(parseCsv(text)) });
      setFailedToRead(false);
    } catch {
      setFile(null);
      setFailedToRead(true);
    }
  };

  const preview = file?.preview;
  const fieldName = (field: string) => t(`import.fields.${field}` as 'import.fields.name');
  const problemText = (key: string) => t(`errors.${key in ERRORS ? key : 'unexpected'}` as 'errors.required');

  const run = () => {
    if (!preview || preview.valid.length === 0) return;
    startTransition(async () => {
      const result = await importCommittees(preview.valid);
      if (!result.ok) {
        toast.error(t(result.error === 'forbidden' ? 'toasts.forbidden' : 'toasts.unexpected'));
        return;
      }
      toast.success(
        t('import.done', {
          created: result.data.created,
          updated: result.data.updated,
          both: result.data.created > 0 && result.data.updated > 0 ? 'yes' : 'no',
        }),
      );
      setFile(null);
      onOpenChange(false);
    });
  };

  return (
    <AdminDialog
      open={open}
      onOpenChange={close}
      size="lg"
      title={t('import.title')}
      description={t('import.text')}
      footer={
        <>
          <Button variant="quiet" size="sm" onClick={() => close(false)} disabled={pending}>
            {t('import.close')}
          </Button>
          <Button
            size="sm"
            onClick={run}
            disabled={pending || !preview || preview.valid.length === 0}
            aria-busy={pending || undefined}
          >
            {pending ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden />
                {t('import.working')}
              </>
            ) : (
              t('import.go', { count: preview?.valid.length ?? 0 })
            )}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => void choose(event.target.files?.[0])}
          />
          <Button variant="quiet" size="sm" onClick={() => inputRef.current?.click()}>
            <FileUp aria-hidden />
            {file ? file.name : t('import.choose')}
          </Button>
          <label htmlFor={id} className="sr-only">
            {t('import.file')}
          </label>
          <a
            href={TEMPLATE}
            download="committees-template.csv"
            className="text-small font-medium text-brand-dark"
          >
            {t('import.template')}
          </a>
        </div>

        {failedToRead && (
          <p role="alert" className="text-small font-medium text-brand-dark">
            {t('errors.unexpected')}
          </p>
        )}
        {preview && preview.missingColumns.length > 0 && (
          <p role="alert" className="flex items-center gap-2 text-small font-medium text-brand-dark">
            <CircleAlert className="size-4 shrink-0" aria-hidden />
            {t('import.missing', { columns: preview.missingColumns.join(', ') })}
          </p>
        )}
        {preview && preview.missingColumns.length === 0 && (
          <>
            <p role="status" className="text-small font-medium">
              {t('import.summary', { valid: preview.valid.length, failed: preview.failed.length })}
              {preview.tooMany && <> {t('import.tooMany')}</>}
            </p>
            {preview.failed.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-small font-bold">{t('import.failedTitle')}</h3>
                <div className="max-h-56 overflow-auto rounded-md border border-line">
                  <table className="w-full text-left text-small">
                    <thead className="bg-surface text-[12px] tracking-[0.06em] text-muted-ink uppercase">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-medium">
                          {t('import.line')}
                        </th>
                        <th scope="col" className="px-3 py-2 font-medium">
                          {t('columns.committee')}
                        </th>
                        <th scope="col" className="px-3 py-2 font-medium">
                          {t('import.problem')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {preview.failed.map((row) => (
                        <tr key={row.line}>
                          <td className="px-3 py-2 tabular-nums">{row.line}</td>
                          <td className="px-3 py-2">{row.name || t('row.none')}</td>
                          <td className="px-3 py-2">
                            <ul className="m-0 list-none p-0">
                              {row.problems.map((problem) => (
                                <li key={`${problem.field}-${problem.key}`}>
                                  <strong className="font-medium">{fieldName(problem.field)}:</strong>{' '}
                                  {problemText(problem.key)}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminDialog>
  );
}

const ERRORS: Record<string, true> = {
  required: true,
  tooLong: true,
  country: true,
  number: true,
  range: true,
  url: true,
  type: true,
  duplicate: true,
};
