import { Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/cn';
import { type AnyMedia, isSampleMedia } from '@/shared/types/media';

import { BrandLogo } from './brand-logo';

// Size presets for next/image `sizes` (cards: 3 / 2 / 1 per row).
const sizes = {
  card: '(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw',
  cover: '(min-width: 1248px) 1200px, 100vw',
  thumb: '(min-width: 1024px) 240px, 33vw',
  full: '100vw',
} as const;

type MediaImageProps = {
  media: AnyMedia | null | undefined;
  preset: keyof typeof sizes;
  /** LCP image (hero / detail cover). Everything else lazy-loads. */
  priority?: boolean;
  className?: string;
};

/**
 * Fills its (relative, sized) parent. No media → the designed fallback (white logo on red).
 * Sample fixtures → the canvas's striped "Photo: …" placeholder.
 */
export function MediaImage({ media, preset, priority, className }: MediaImageProps) {
  const t = useTranslations('ui');

  if (!media) {
    return (
      <div className={cn('absolute inset-0 flex items-center justify-center bg-brand', className)}>
        <BrandLogo variant="white" height={64} alt="" className="h-auto w-[42%] opacity-95" />
      </div>
    );
  }

  if (isSampleMedia(media)) {
    return (
      <div
        role="img"
        aria-label={media.alt}
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-muted-ink',
          'bg-[repeating-linear-gradient(135deg,var(--color-divider)_0_12px,var(--color-line)_12px_24px)]',
          className,
        )}
      >
        <ImageIcon className="size-8" strokeWidth={1.6} aria-hidden />
        <span aria-hidden className="max-w-60 text-[13px] leading-[1.4]">
          {t('samplePhoto', { caption: media.caption })}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={media.src}
      alt={media.alt}
      fill
      sizes={sizes[preset]}
      priority={priority}
      className={cn('object-cover', className)}
    />
  );
}
