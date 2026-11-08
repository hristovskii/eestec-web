'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Button } from '@/shared/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog';

import {
  clampOffset,
  clampZoom,
  cropRect,
  type Offset,
  shownSize,
  ZOOM_MAX,
  ZOOM_MIN,
} from '../../domain/crop';
import { PHOTO } from '../../domain/profile-self';

const FRAME = 180;
const STEP = 12;

/**
 * "Adjust your photo" (MyProfileStates): the picked picture in a square frame, dragged to move and
 * zoomed with a slider; "Use photo" cuts the square and gives back a ~600 px JPEG.
 */
export function PhotoCropper({
  file,
  onCancel,
  onUse,
}: {
  file: File | null;
  onCancel: () => void;
  onUse: (photo: Blob) => void;
}) {
  const t = useTranslations('members.me.crop');
  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription className="text-small">{t('hint')}</DialogDescription>
        </DialogHeader>
        {/* The content is mounted while the dialog is open, so every picked file starts afresh. */}
        {file && <CropBody file={file} onCancel={onCancel} onUse={onUse} />}
      </DialogContent>
    </Dialog>
  );
}

function CropBody({
  file,
  onCancel,
  onUse,
}: {
  file: File;
  onCancel: () => void;
  onUse: (photo: Blob) => void;
}) {
  const t = useTranslations('members.me.crop');
  const [source, setSource] = React.useState<{ url: string; width: number; height: number } | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [zoom, setZoom] = React.useState(ZOOM_MIN);
  const [offset, setOffset] = React.useState<Offset>({ x: 0, y: 0 });
  const image = React.useRef<HTMLImageElement>(null);
  const drag = React.useRef<{ x: number; y: number; start: Offset } | null>(null);

  // Open the picked file; the address is released when the dialog closes.
  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => setSource({ url, width: probe.naturalWidth, height: probe.naturalHeight });
    probe.onerror = () => setFailed(true);
    probe.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const size = source ? { width: source.width, height: source.height } : null;
  const shown = size ? shownSize(size, FRAME, zoom) : null;

  const move = (next: Offset, nextZoom = zoom) => {
    if (size) setOffset(clampOffset(next, size, FRAME, nextZoom));
  };

  function changeZoom(value: number) {
    const next = clampZoom(value);
    setZoom(next);
    move(offset, next);
  }

  function confirm() {
    if (!source || !size || !image.current) return;
    const rect = cropRect(size, FRAME, zoom, offset);
    const canvas = document.createElement('canvas');
    canvas.width = PHOTO.size;
    canvas.height = PHOTO.size;
    const context = canvas.getContext('2d');
    if (!context) return;
    // A picture with transparent parts (PNG) gets a white background in a JPEG.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, PHOTO.size, PHOTO.size);
    context.drawImage(image.current, rect.x, rect.y, rect.size, rect.size, 0, 0, PHOTO.size, PHOTO.size);
    canvas.toBlob(
      (blob) => {
        if (blob) onUse(blob);
        else setFailed(true);
      },
      PHOTO.sendType,
      0.9,
    );
  }

  return (
    <>
      {failed ? (
        <p role="alert" className="rounded-sm bg-brand-tint p-4 text-small font-medium text-brand-dark">
          {t('failed')}
        </p>
      ) : (
        <div
          // The picture moves with the mouse or a finger, and with the arrow keys.
          tabIndex={0}
          role="group"
          aria-label={t('alt')}
          data-testid="crop-area"
          className="relative h-[220px] touch-none overflow-hidden rounded-md bg-ink/60 outline-none focus-visible:outline-3 focus-visible:outline-brand"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { x: event.clientX, y: event.clientY, start: offset };
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            move({
              x: drag.current.start.x + event.clientX - drag.current.x,
              y: drag.current.start.y + event.clientY - drag.current.y,
            });
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={(event) => {
            const delta: Record<string, Offset> = {
              ArrowLeft: { x: -STEP, y: 0 },
              ArrowRight: { x: STEP, y: 0 },
              ArrowUp: { x: 0, y: -STEP },
              ArrowDown: { x: 0, y: STEP },
            };
            const step = delta[event.key];
            if (!step) return;
            event.preventDefault();
            move({ x: offset.x + step.x, y: offset.y + step.y });
          }}
        >
          {source && shown && (
            // eslint-disable-next-line @next/next/no-img-element -- a local preview of the picked file
            <img
              ref={image}
              src={source.url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute top-1/2 left-1/2 max-w-none select-none"
              style={{
                width: shown.width,
                height: shown.height,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          )}
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 size-[180px] -translate-x-1/2 -translate-y-1/2 rounded-md border-[3px] border-white ring-[999px] ring-black/45"
          />
        </div>
      )}

      <label className="flex items-center gap-4 text-small font-medium">
        {t('zoom')}
        <input
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.05}
          value={zoom}
          disabled={!source}
          onChange={(event) => changeZoom(Number(event.target.value))}
          className="h-2 flex-1 accent-brand"
        />
      </label>

      <DialogFooter>
        <Button type="button" variant="quiet" size="sm" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button type="button" size="sm" disabled={!source} onClick={confirm}>
          {t('use')}
        </Button>
      </DialogFooter>
    </>
  );
}
