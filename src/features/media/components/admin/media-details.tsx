'use client';

import { Copy, Download, LoaderCircle, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { ConfirmDeleteDialog } from '@/shared/admin-ui/dialogs';
import { formatDate } from '@/shared/i18n/format';
import { Checkbox, ChoiceLabel } from '@/shared/ui/form/choice';
import { FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { SheetContent, SheetHeader, SheetTitle } from '@/shared/ui/primitives/sheet';
import { Textarea } from '@/shared/ui/primitives/textarea';

import { deleteMedia, updateMedia } from '../../actions/media';
import { formatBytes } from '../../domain/upload-rules';
import type { MediaItem } from '../../types';
import { errorText } from './error-text';
import { MediaThumb } from './media-thumb';

/** Right-hand panel for one file: preview, facts, alt text + credit, copy link, download, delete. */
export function MediaDetails({
  item,
  editable,
  onDeleted,
}: {
  item: MediaItem;
  editable: boolean;
  onDeleted: () => void;
}) {
  const t = useTranslations('admin.media');
  const isImage = item.kind === 'image';
  const [alt, setAlt] = React.useState(item.alt ?? '');
  const [decorative, setDecorative] = React.useState(item.alt === '');
  const [credit, setCredit] = React.useState(item.credit ?? '');
  const [errors, setErrors] = React.useState<{ alt?: string; credit?: string }>({});
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const dirty =
    alt !== (item.alt ?? '') || decorative !== (item.alt === '') || credit !== (item.credit ?? '');

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateMedia({ id: item.id, alt, decorative, credit });
      if (result.ok) {
        setErrors({});
        toast.success(t('details.saved'));
      } else if (result.error === 'validation') {
        const alt = result.fieldErrors.alt?.[0];
        const credit = result.fieldErrors.credit?.[0];
        setErrors({ alt: alt && errorText(t, alt), credit: credit && errorText(t, credit) });
      } else {
        toast.error(errorText(t, result.error));
      }
    });
  };

  const copyLink = async () => {
    if (!item.src) return;
    await navigator.clipboard.writeText(new URL(item.src, window.location.origin).toString());
    toast.success(t('details.copied'));
  };

  const facts: [string, string][] = [
    [t('details.file'), item.fileName],
    [t('details.type'), item.mimeType],
    [
      t('details.dimensions'),
      item.width && item.height
        ? t('meta', { dimensions: `${item.width} × ${item.height}`, size: formatBytes(item.size) })
        : formatBytes(item.size),
    ],
    [
      t('details.uploaded'),
      t('details.uploadedBy', {
        date: formatDate(item.uploadedAt, 'en', 'date'),
        name: item.uploadedBy.name,
      }),
    ],
  ];

  return (
    <SheetContent side="right" className="w-[440px] gap-0 text-small">
      <SheetHeader>
        <SheetTitle className="text-[18px]">{t('details.title')}</SheetTitle>
      </SheetHeader>
      <div className="flex flex-col gap-5 px-5 pb-6">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-line">
          <MediaThumb item={item} sizes="400px" />
        </div>
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1.5">
          {facts.map(([label, value]) => (
            <React.Fragment key={label}>
              <dt className="text-muted-ink">{label}</dt>
              <dd className="m-0 break-words">{value}</dd>
            </React.Fragment>
          ))}
        </dl>

        {editable ? (
          <form onSubmit={save} noValidate className="flex flex-col gap-4 border-t border-divider pt-5">
            {isImage && (
              <>
                <FormField
                  id="media-alt"
                  label={t('details.alt')}
                  required={!decorative}
                  help={t('details.altHelp')}
                  error={errors.alt}
                >
                  {(control) => (
                    <Textarea
                      {...control}
                      rows={3}
                      value={decorative ? '' : alt}
                      disabled={decorative}
                      onChange={(event) => setAlt(event.target.value)}
                      className="min-h-0 md:text-small"
                    />
                  )}
                </FormField>
                <ChoiceLabel
                  control={
                    <Checkbox
                      checked={decorative}
                      onChange={(event) => setDecorative(event.target.checked)}
                    />
                  }
                >
                  {t('details.decorative')}
                  <span className="block text-muted-ink">{t('details.decorativeHelp')}</span>
                </ChoiceLabel>
              </>
            )}
            <FormField id="media-credit" label={t('details.credit')} optional error={errors.credit}>
              {(control) => (
                <Input
                  {...control}
                  value={credit}
                  onChange={(event) => setCredit(event.target.value)}
                  className="md:text-small"
                />
              )}
            </FormField>
            <Button
              type="submit"
              size="sm"
              className="w-fit"
              disabled={!dirty || pending}
              aria-busy={pending || undefined}
            >
              {pending ? (
                <>
                  <LoaderCircle className="animate-spin" aria-hidden />
                  {t('details.saving')}
                </>
              ) : (
                t('details.save')
              )}
            </Button>
          </form>
        ) : (
          <p className="border-t border-divider pt-5 text-muted-ink">
            {isImage && item.alt ? (
              <>
                <strong className="block text-ink">{t('details.alt')}</strong>
                {item.alt}
              </>
            ) : (
              t('details.readOnly')
            )}
          </p>
        )}

        <div className="flex flex-wrap gap-2 border-t border-divider pt-5">
          {item.src ? (
            <>
              <Button variant="quiet" size="sm" onClick={() => void copyLink()}>
                <Copy aria-hidden />
                {t('details.copyLink')}
              </Button>
              <Button asChild variant="quiet" size="sm">
                <a href={item.src} download={item.fileName}>
                  <Download aria-hidden />
                  {t('details.download')}
                </a>
              </Button>
            </>
          ) : (
            <span className="text-muted-ink">{t('details.noFile')}</span>
          )}
          {editable && (
            <Button
              variant="dangerOutline"
              size="sm"
              className="ml-auto"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 aria-hidden />
              {t('details.delete')}
            </Button>
          )}
        </div>
      </div>

      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('details.deleteTitle', { name: item.fileName })}
        description={t('details.deleteText')}
        confirmLabel={t('details.deleteConfirm')}
        onConfirm={async () => {
          const result = await deleteMedia({ id: item.id });
          setConfirmDelete(false);
          if (result.ok) {
            toast.success(t('details.deleted'));
            onDeleted();
          } else {
            toast.error(errorText(t, result.error));
          }
        }}
      />
    </SheetContent>
  );
}
