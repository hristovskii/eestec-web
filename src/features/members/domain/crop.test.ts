import { describe, expect, it } from 'vitest';

import { clampOffset, clampZoom, cropRect, shownSize } from './crop';

const landscape = { width: 2000, height: 1000 };
const FRAME = 180;

describe('photo crop', () => {
  it('shows the picture so that its shorter side just covers the frame at zoom 1', () => {
    expect(shownSize(landscape, FRAME, 1)).toEqual({ width: 360, height: 180 });
    expect(shownSize(landscape, FRAME, 2)).toEqual({ width: 720, height: 360 });
  });

  it('keeps the zoom between 1 and 3', () => {
    expect(clampZoom(0.2)).toBe(1);
    expect(clampZoom(5)).toBe(3);
    expect(clampZoom(1.7)).toBe(1.7);
  });

  it('cannot drag the picture past the frame (no empty edges)', () => {
    // Zoom 1: a landscape picture is 90 px wider than the frame on each side, not taller.
    expect(clampOffset({ x: 500, y: 40 }, landscape, FRAME, 1)).toEqual({ x: 90, y: 0 });
    expect(clampOffset({ x: -500, y: -40 }, landscape, FRAME, 1)).toEqual({ x: -90, y: -0 });
    // Zoom 2: 270 px sideways, 90 px up and down.
    expect(clampOffset({ x: 100, y: 200 }, landscape, FRAME, 2)).toEqual({ x: 100, y: 90 });
  });

  it('cuts the middle square of the original when nothing is dragged', () => {
    expect(cropRect(landscape, FRAME, 1, { x: 0, y: 0 })).toEqual({ x: 500, y: 0, size: 1000 });
    expect(cropRect(landscape, FRAME, 2, { x: 0, y: 0 })).toEqual({ x: 750, y: 250, size: 500 });
  });

  it('moves the cut the other way when the picture is dragged', () => {
    // Dragging the picture right by 90 px shows its left part: the cut moves left in the original.
    const rect = cropRect(landscape, FRAME, 1, { x: 90, y: 0 });
    expect(rect.x).toBe(0);
    expect(rect.size).toBe(1000);
    // A drag past the edge is held at the edge.
    expect(cropRect(landscape, FRAME, 1, { x: 900, y: 0 }).x).toBe(0);
    // Always inside the original.
    for (const x of [-500, 0, 500])
      for (const zoom of [1, 2, 3]) {
        const cut = cropRect(landscape, FRAME, zoom, { x, y: 0 });
        expect(cut.x).toBeGreaterThanOrEqual(0);
        expect(cut.x + cut.size).toBeLessThanOrEqual(landscape.width + 1e-9);
      }
  });
});
