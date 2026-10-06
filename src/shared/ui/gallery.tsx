'use client';

import { ChevronLeft, ChevronRight, Hand, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog as DialogPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';
import { type AnyMedia, isSampleMedia } from '@/shared/types/media';

import { MediaImage } from './media-image';
import { Button } from './primitives/button';

// GalleryGrid + Lightbox (EventDetail, Lightbox; later MemoryPost). The grid shows the first
// photos and a "+N more" tile; any photo opens the lightbox at that photo.

const DESKTOP_CELLS = 8;
const MOBILE_CELLS = 6;

/** Caption under a photo: its description, plus the credit ("· Photo: Ana Trajkovska"). */
function useCaption() {
  const t = useTranslations('ui.lightbox');
  return (photo: AnyMedia) =>
    [photo.alt, photo.credit && t('credit', { credit: photo.credit })].filter(Boolean).join(' · ');
}

const darkSample =
  'bg-[repeating-linear-gradient(135deg,var(--color-ink-2)_0_14px,var(--color-ink)_14px_28px)] text-line-strong';

export function GalleryGrid({ photos, title }: { photos: AnyMedia[]; title: string }) {
  const t = useTranslations('ui.lightbox');
  const [open, setOpen] = React.useState<number | null>(null);
  const caption = useCaption();
  const count = photos.length;
  const desktopMore = count > DESKTOP_CELLS ? count - (DESKTOP_CELLS - 1) : 0;
  const mobileMore = count > MOBILE_CELLS ? count - (MOBILE_CELLS - 1) : 0;
  const shown = photos.slice(0, desktopMore ? DESKTOP_CELLS - 1 : DESKTOP_CELLS);

  const tile =
    'relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-[8px] p-0 sm:rounded-md focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand hover:ring-3 hover:ring-brand';

  const moreTile = (more: number, index: number, className: string) => (
    <li className={className}>
      <button
        type="button"
        className={tile}
        onClick={() => setOpen(index)}
        aria-label={t('openMore', { count: more })}
      >
        <MediaImage media={photos[index]} preset="thumb" />
        <span
          aria-hidden
          className="absolute inset-0 flex flex-col items-center justify-center bg-ink/72 text-[20px] font-bold text-white sm:text-[22px]"
        >
          {t('more', { count: more })}
          <span className="text-small font-medium">
            <span className="sm:hidden">{t('moreShort')}</span>
            <span className="max-sm:hidden">{t('morePhotos')}</span>
          </span>
        </span>
      </button>
    </li>
  );

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {shown.map((photo, index) => (
          <li key={index} className={cn(mobileMore && index >= MOBILE_CELLS - 1 && 'max-sm:hidden')}>
            <button
              type="button"
              className={tile}
              onClick={() => setOpen(index)}
              aria-label={t('open', { caption: photo.alt })}
            >
              <MediaImage media={photo} preset="thumb" className="text-[12px] leading-[1.35]" />
            </button>
          </li>
        ))}
        {desktopMore > 0 && moreTile(desktopMore, DESKTOP_CELLS - 1, 'max-sm:hidden')}
        {mobileMore > 0 && moreTile(mobileMore, MOBILE_CELLS - 1, 'sm:hidden')}
      </ul>
      {mobileMore > 0 && (
        <Button variant="secondary" block className="sm:hidden" onClick={() => setOpen(0)}>
          {t('viewAll', { count })}
        </Button>
      )}
      <Lightbox photos={photos} title={title} index={open} onIndexChange={setOpen} caption={caption} />
    </>
  );
}

function Lightbox({
  photos,
  title,
  index,
  onIndexChange,
  caption,
}: {
  photos: AnyMedia[];
  title: string;
  /** Open at this photo; null = closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  caption: (photo: AnyMedia) => string;
}) {
  const t = useTranslations('ui.lightbox');
  const count = photos.length;
  const current = index === null ? null : photos[index];
  const go = (step: number) => index !== null && onIndexChange((index + step + count) % count);
  const swipeStart = React.useRef<number | null>(null);
  const thumbsRef = React.useRef<HTMLUListElement>(null);

  // Keep the current thumbnail in view.
  React.useEffect(() => {
    if (index === null) return;
    thumbsRef.current?.children[index]?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [index]);

  return (
    <DialogPrimitive.Root open={index !== null} onOpenChange={(open) => !open && onIndexChange(null)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') go(1);
            if (event.key === 'ArrowLeft') go(-1);
          }}
          className="fixed inset-0 z-50 flex flex-col bg-ink text-white outline-none sm:bg-ink"
        >
          <div className="flex h-16 shrink-0 items-center justify-between gap-4 pr-2 pl-4 sm:h-18 sm:pr-6 sm:pl-8">
            <div className="flex min-w-0 flex-col gap-0.5">
              <DialogPrimitive.Title className="truncate text-[16px] font-bold max-sm:sr-only">
                <span className="sr-only">{t('labelPrefix')} </span>
                {title}
              </DialogPrimitive.Title>
              {index !== null && (
                <span
                  aria-live="polite"
                  className="text-small font-medium text-line-strong max-sm:text-[15px] max-sm:text-white"
                >
                  <span className="max-sm:hidden">{t('position', { index: index + 1, count })}</span>
                  <span className="sm:hidden">{t('positionShort', { index: index + 1, count })}</span>
                </span>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label={t('close')}
              className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-white hover:bg-white/20 focus-visible:outline-3 focus-visible:outline-brand sm:bg-white/12"
            >
              <X className="size-6" aria-hidden />
            </DialogPrimitive.Close>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center gap-8 sm:px-8">
            <NavButton label={t('previous')} onClick={() => go(-1)} disabled={count < 2}>
              <ChevronLeft className="size-6" aria-hidden />
            </NavButton>
            {current && (
              <figure className="m-0 flex h-full max-h-[640px] w-full max-w-[1040px] min-w-0 flex-col items-center justify-center gap-3.5">
                <div
                  className="relative aspect-[4/3] w-full touch-pan-y sm:aspect-auto sm:h-full sm:max-h-[585px] sm:min-h-0 sm:flex-1 sm:rounded-sm"
                  onPointerDown={(event) => {
                    swipeStart.current = event.clientX;
                  }}
                  onPointerUp={(event) => {
                    if (swipeStart.current === null) return;
                    const delta = event.clientX - swipeStart.current;
                    swipeStart.current = null;
                    if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
                  }}
                >
                  <MediaImage
                    media={current}
                    preset="lightbox"
                    fit="contain"
                    className={cn(isSampleMedia(current) && darkSample, 'sm:rounded-sm')}
                  />
                </div>
                <figcaption className="px-4 text-[15px] leading-[1.45] font-medium text-divider sm:text-center">
                  {caption(current)}
                </figcaption>
                <span className="flex items-center gap-2 text-small font-medium text-line-strong sm:hidden">
                  <Hand className="size-4" aria-hidden />
                  {t('swipe')}
                </span>
              </figure>
            )}
            <NavButton label={t('next')} onClick={() => go(1)} disabled={count < 2}>
              <ChevronRight className="size-6" aria-hidden />
            </NavButton>
          </div>

          <ul
            ref={thumbsRef}
            className="flex shrink-0 gap-1.5 overflow-x-auto px-4 pt-4 pb-7 sm:h-30 sm:items-center sm:justify-center sm:gap-2.5 sm:py-0"
          >
            {photos.map((photo, thumbIndex) => (
              <li key={thumbIndex} className="shrink-0">
                <button
                  type="button"
                  aria-label={t('thumb', { index: thumbIndex + 1 })}
                  aria-current={thumbIndex === index ? 'true' : undefined}
                  onClick={() => onIndexChange(thumbIndex)}
                  className={cn(
                    'relative block size-14 cursor-pointer overflow-hidden rounded-[6px] p-0 sm:h-16 sm:w-24',
                    'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand',
                    thumbIndex === index
                      ? 'ring-2 ring-brand ring-offset-2 ring-offset-ink'
                      : 'opacity-55 hover:opacity-90',
                  )}
                >
                  <MediaImage
                    media={photo}
                    preset="thumb"
                    className={cn(isSampleMedia(photo) && darkSample, '[&_span]:hidden [&_svg]:hidden')}
                  />
                </button>
              </li>
            ))}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function NavButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="hidden size-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-ink hover:bg-divider focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:invisible sm:flex"
    >
      {children}
    </button>
  );
}
