import { MediaThumb } from '@/features/media/admin';
import type { MediaItem } from '@/features/media';
import { cn } from '@/shared/lib/cn';

/**
 * The 56 × 40 cover in admin rows (AdminEvents). Sample photos and events without a cover show
 * the canvas's striped box; the row is already named by its title, so the image is decorative.
 */
export function EventThumb({ item, className }: { item: MediaItem | undefined; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative block h-10 w-14 shrink-0 overflow-hidden rounded-sm',
        'bg-[repeating-linear-gradient(135deg,var(--color-divider)_0_8px,var(--color-line)_8px_16px)]',
        className,
      )}
    >
      {item?.src && <MediaThumb item={item} decorative sizes="56px" />}
    </span>
  );
}
