'use client';

import { Library, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { LocalizedField } from '@/shared/admin-ui/localized-field';
import type { MediaRef } from '@/shared/types/media';
import { MediaImage } from '@/shared/ui/media-image';
import { Button } from '@/shared/ui/primitives/button';

import type { MediaItem } from '../../types';
import { MediaPicker } from './media-picker';
import { MediaThumb } from './media-thumb';

type MediaRefFieldProps = {
  /** Id of the alt-text field (the error summary links to it). */
  altId: string;
  label: string;
  value: MediaRef | null;
  onChange: (value: MediaRef | null) => void;
  /** Library files used on the page, by id, and how to add one that was just picked. */
  media: Record<string, MediaItem>;
  addMedia: (item: MediaItem) => void;
  /** Translated error of the Macedonian alt text, if any. */
  altError?: string;
  maxAlt: number;
  /** Shown while there is no photo ("No photo. It is optional."). */
  empty: string;
};

/**
 * A photo from the Media library with its own alt text for this use (required in Macedonian,
 * English optional): Home, Journey and the other page editors.
 */
export function MediaRefField({
  altId,
  label,
  value,
  onChange,
  media,
  addMedia,
  altError,
  maxAlt,
  empty,
}: MediaRefFieldProps) {
  const t = useTranslations('admin.media.refField');
  const [picking, setPicking] = React.useState(false);
  const item = value ? media[value.mediaId] : undefined;

  const use = (picked: MediaItem) => {
    addMedia(picked);
    // Keep the text already written for this place; otherwise start from the library's alt text.
    onChange({ mediaId: picked.id, alt: value?.alt.mk ? value.alt : { mk: picked.alt ?? '' } });
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="text-small font-medium">{label}</span>
      <div className="grid items-start gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-md border border-line">
          {item ? <MediaThumb item={item} sizes="200px" /> : <MediaImage media={null} preset="card" />}
          {value && (
            <Button
              size="icon"
              variant="quiet"
              aria-label={t('remove', { label })}
              className="absolute top-1.5 right-1.5 size-7.5 bg-white/95"
              onClick={() => onChange(null)}
            >
              <X aria-hidden />
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {value ? (
            <LocalizedField
              id={altId}
              label={t('alt')}
              required
              help={t('altHelp')}
              value={value.alt}
              onChange={(alt) => onChange({ ...value, alt })}
              error={altError}
              maxLength={maxAlt}
              multiline
              rows={2}
            />
          ) : (
            <p className="text-small text-muted-ink">{empty}</p>
          )}
          <div>
            <Button variant="quiet" size="sm" onClick={() => setPicking(true)}>
              <Library aria-hidden />
              {value ? t('replace') : t('choose')}
            </Button>
          </div>
        </div>
      </div>
      <MediaPicker
        open={picking}
        onOpenChange={setPicking}
        onPick={use}
        currentId={value?.mediaId}
        requireAlt={false}
        allowSamples
      />
    </div>
  );
}
