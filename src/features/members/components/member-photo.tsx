import { User } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/cn';

import type { ProfilePhoto } from '../types';

const stripes =
  'bg-[repeating-linear-gradient(135deg,var(--color-divider)_0_12px,var(--color-line)_12px_24px)]';

/**
 * Fills its (relative, sized) parent. A photo without a file (sample data) is the canvas's striped
 * placeholder; no photo at all is the initials on pale red. A member's own photo gets the alt text
 * "Photo of {name}".
 */
export function MemberPhoto({
  photo,
  name,
  initials,
  initialsClassName,
  sizes = '(min-width: 1024px) 240px, 50vw',
  className,
}: {
  photo: ProfilePhoto | null;
  name: string;
  initials: string;
  initialsClassName?: string;
  sizes?: string;
  className?: string;
}) {
  const t = useTranslations('members.card');
  if (!photo) {
    return (
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 flex items-center justify-center bg-brand-tint text-[40px] font-bold text-brand-dark',
          initialsClassName,
          className,
        )}
      >
        {initials}
      </div>
    );
  }
  if (!photo.src) {
    return (
      <div
        role="img"
        aria-label={t('photoAlt', { name })}
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3 text-muted-ink',
          stripes,
          className,
        )}
      >
        <User className="size-7" strokeWidth={1.6} aria-hidden />
      </div>
    );
  }
  return (
    <Image
      src={photo.src}
      alt={t('photoAlt', { name })}
      fill
      sizes={sizes}
      // Photos from the sign-up form are served by the app itself (dev route / storage): not resized.
      unoptimized
      className={cn('object-cover', className)}
    />
  );
}
