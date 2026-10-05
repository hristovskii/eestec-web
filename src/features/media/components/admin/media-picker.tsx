'use client';

import { Check, Search, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { AdminBadge } from '@/shared/admin-ui/admin-page';
import { AdminDialog } from '@/shared/admin-ui/dialogs';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';

import { searchPickerMedia } from '../../actions/pick';
import type { MediaItem } from '../../types';
import { MediaThumb } from './media-thumb';
import { UploadDialog } from './upload-dialog';

type PickerRules = { requireAlt: boolean; allowSamples: boolean };

/** Why a file can't be picked yet, or null. */
const unusable = (item: MediaItem, rules: PickerRules): 'unusableSample' | 'unusableAlt' | null =>
  !item.src && !rules.allowSamples
    ? 'unusableSample'
    : rules.requireAlt && item.kind === 'image' && item.alt === null
      ? 'unusableAlt'
      : null;

type MediaPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (item: MediaItem) => void;
  /** Currently used file (highlighted). */
  currentId?: string | null;
  /** image (default) or document (PDFs). */
  kind?: 'image' | 'document';
  /**
   * Images need alt text in the library before they're used (logos, share images). Off where the
   * use has its own alt text (event covers and galleries).
   */
  requireAlt?: boolean;
  /** SAMPLE placeholders have no file; allowed where the sample page can show the placeholder. */
  allowSamples?: boolean;
};

/** Choose a file from the Media library, or upload a new one (Settings › Branding, SEO, events…). */
export function MediaPicker({
  open,
  onOpenChange,
  onPick,
  currentId,
  kind = 'image',
  requireAlt = true,
  allowSamples = false,
}: MediaPickerProps) {
  const t = useTranslations('admin.media');
  const rules = { requireAlt, allowSamples };
  const copy = kind === 'document' ? 'pickerDocument' : 'picker';
  const tDialogs = useTranslations('admin.ui.dialogs');
  const [query, setQuery] = React.useState('');
  const [items, setItems] = React.useState<MediaItem[] | null>(null);
  const [page, setPage] = React.useState({ page: 1, pageCount: 1 });
  const [selected, setSelected] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [, startTransition] = React.useTransition();

  const load = React.useCallback(
    (q: string, pageNumber: number, append: boolean) => {
      startTransition(async () => {
        const result = await searchPickerMedia({ q, page: pageNumber, kind });
        if (!result.ok) return;
        setItems((previous) =>
          append && previous ? [...previous, ...result.data.items] : result.data.items,
        );
        setPage({ page: result.data.page, pageCount: result.data.pageCount });
      });
    },
    [kind],
  );

  // Search 300 ms after typing stops (and once when the picker opens).
  React.useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => load(query, 1, false), query ? 300 : 0);
    return () => window.clearTimeout(id);
  }, [open, query, load]);

  const close = (next: boolean) => {
    if (!next) {
      setSelected(null);
      setQuery('');
      setItems(null);
    }
    onOpenChange(next);
  };
  const chosen = items?.find((item) => item.id === selected) ?? null;

  return (
    <>
      <AdminDialog
        open={open && !uploading}
        onOpenChange={close}
        size="lg"
        title={t(`${copy}.title`)}
        description={t(`${copy}.text`)}
        footer={
          <>
            <Button variant="ghost" size="sm" className="sm:mr-auto" onClick={() => setUploading(true)}>
              <Upload aria-hidden />
              {t('picker.upload')}
            </Button>
            <Button variant="quiet" size="sm" onClick={() => close(false)}>
              {tDialogs('cancel')}
            </Button>
            <Button
              size="sm"
              disabled={!chosen}
              onClick={() => {
                if (!chosen) return;
                onPick(chosen);
                close(false);
              }}
            >
              {t(`${copy}.use`)}
            </Button>
          </>
        }
      >
        <label className="relative">
          <span className="sr-only">{t(`${copy}.search`)}</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-ink"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('filters.searchPlaceholder')}
            className="pl-9 md:text-small"
          />
        </label>
        {items === null ? (
          <p role="status" className="py-8 text-center text-muted-ink">
            {t(`${copy}.loading`)}
          </p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-muted-ink">{t(`${copy}.empty`)}</p>
        ) : (
          <div
            role="radiogroup"
            aria-label={t(`${copy}.title`)}
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
          >
            {items.map((item) => {
              const problem = unusable(item, rules);
              const isSelected = selected === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-disabled={problem ? true : undefined}
                  aria-label={problem ? `${item.fileName} (${t(`picker.${problem}`)})` : item.fileName}
                  onClick={() => !problem && setSelected(item.id)}
                  className={cn(
                    'relative flex flex-col overflow-hidden rounded-sm border text-left',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                    isSelected ? 'border-2 border-brand' : 'border-line',
                    problem ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-ink',
                  )}
                >
                  <span className="relative block aspect-[4/3]">
                    <MediaThumb item={item} decorative sizes="150px" />
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-brand text-white">
                        <Check className="size-4" aria-hidden />
                      </span>
                    )}
                    {item.id === currentId && !isSelected && (
                      <span className="absolute top-1.5 left-1.5">
                        <AdminBadge tone="dark">{t('picker.current')}</AdminBadge>
                      </span>
                    )}
                  </span>
                  <span className="truncate px-2 py-1.5 text-[12px] font-medium">{item.fileName}</span>
                  {problem === 'unusableAlt' && (
                    <span className="absolute bottom-8 left-1.5">
                      <AdminBadge tone="attention">{t('noAlt')}</AdminBadge>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {page.page < page.pageCount && (
          <Button
            variant="quiet"
            size="sm"
            className="self-center"
            onClick={() => load(query, page.page + 1, true)}
          >
            {t('picker.more')}
          </Button>
        )}
      </AdminDialog>
      <UploadDialog
        open={uploading}
        onOpenChange={(next) => {
          setUploading(next);
          if (!next) load(query, 1, false);
        }}
      />
    </>
  );
}
