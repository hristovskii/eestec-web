'use client';

import { Library, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import type { MediaItem } from '@/features/media';
import { MediaPicker, MediaThumb } from '@/features/media/admin';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import { MediaImage } from '@/shared/ui/media-image';
import { Button } from '@/shared/ui/primitives/button';

import { HOME_LIMITS } from '../../schemas/home.schema';
import type { HomeImage } from '../../types';
import { fieldId, type SectionProps } from './form-kit';

type ImageFieldProps = Pick<SectionProps, 'media' | 'addMedia' | 'error'> & {
  /** Value path, e.g. "milestones.2.photo". */
  path: string;
  label: string;
  value: HomeImage | null;
  onChange: (value: HomeImage | null) => void;
  /** Where the photo is used, for the empty note. */
  empty: string;
};

/** A photo from the Media library with its own alt text (required in Macedonian, English optional). */
export function HomeImageField({
  path,
  label,
  value,
  onChange,
  media,
  addMedia,
  error,
  empty,
}: ImageFieldProps) {
  const t = useTranslations('admin.home.image');
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
              id={fieldId(`${path}.alt`)}
              label={t('alt')}
              required
              help={t('altHelp')}
              value={value.alt}
              onChange={(alt) => onChange({ ...value, alt })}
              error={error(`${path}.alt.mk`)}
              maxLength={HOME_LIMITS.alt}
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
