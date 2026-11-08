// The square crop of "Adjust your photo": the picture is shown at `zoom` times the size that just
// covers the frame, and can be dragged; this keeps the frame always full (no empty edges) and tells
// the canvas which square of the original to cut out.

export type Size = { width: number; height: number };
export type Offset = { x: number; y: number };

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;

export const clampZoom = (zoom: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));

/** The picture's size on screen, in a square frame of `frame` pixels, at `zoom` (1 = just covers it). */
export function shownSize(image: Size, frame: number, zoom: number): Size {
  const scale = (frame / Math.min(image.width, image.height)) * clampZoom(zoom);
  return { width: image.width * scale, height: image.height * scale };
}

/** `offset` is the picture's centre relative to the frame's centre, in screen pixels. */
export function clampOffset(offset: Offset, image: Size, frame: number, zoom: number): Offset {
  const shown = shownSize(image, frame, zoom);
  const maxX = (shown.width - frame) / 2;
  const maxY = (shown.height - frame) / 2;
  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  };
}

/** The square (in the original picture's pixels) that is inside the frame. */
export function cropRect(
  image: Size,
  frame: number,
  zoom: number,
  offset: Offset,
): { x: number; y: number; size: number } {
  const shown = shownSize(image, frame, zoom);
  const { x, y } = clampOffset(offset, image, frame, zoom);
  const scale = shown.width / image.width;
  const size = frame / scale;
  return {
    x: (image.width - size) / 2 - x / scale,
    y: (image.height - size) / 2 - y / scale,
    size,
  };
}
