import { FileText } from 'lucide-react';
import Image from 'next/image';

import { cn } from '@/shared/lib/cn';
import { MediaImage } from '@/shared/ui/media-image';

import type { MediaItem } from '../../types';

/**
 * Preview of a library file, filling its (relative, sized) parent. Logos and SVGs are shown whole;
 * photos fill the box. Admin previews are not optimized (SVGs can't be, and these are small).
 */
export function MediaThumb({
  item,
  sizes,
  decorative = false,
  className,
}: {
  item: MediaItem;
  sizes: string;
  /** In the grid the card is already named by the file name: the preview adds nothing. */
  decorative?: boolean;
  className?: string;
}) {
  const alt = decorative ? '' : (item.alt ?? '');
  if (item.kind === 'document') {
    return (
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center bg-surface text-muted-ink',
          className,
        )}
      >
        <FileText className="size-10" strokeWidth={1.5} aria-hidden />
      </div>
    );
  }
  if (!item.src) {
    return (
      <MediaImage
        media={{ sample: true, caption: item.sampleCaption ?? item.fileName, alt }}
        preset="thumb"
        className={className}
      />
    );
  }
  // Logos (PNG, SVG) may be transparent or white: show them whole on a checkerboard.
  const whole = item.mimeType === 'image/svg+xml' || item.mimeType === 'image/png';
  return (
    <Image
      src={item.src}
      alt={alt}
      fill
      unoptimized
      sizes={sizes}
      className={cn(
        whole
          ? 'bg-[repeating-conic-gradient(var(--color-line-strong)_0_25%,var(--color-surface)_0_50%)] bg-size-[16px_16px] object-contain p-3'
          : 'object-cover',
        className,
      )}
    />
  );
}
