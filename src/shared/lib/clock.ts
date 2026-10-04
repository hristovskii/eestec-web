// The only place that reads the current time (docs/ARCHITECTURE.md §4.2).
// Mock data is pinned to the canvas moment so badges and countdowns match handoff/screens.
export const CANVAS_NOW = '2026-10-04T18:18:00+02:00';

export function resolveNow(mockNow: string | undefined, usesMockData: boolean): Date {
  if (!usesMockData || mockNow === 'real') return new Date();
  const pinned = new Date(mockNow ?? CANVAS_NOW);
  if (Number.isNaN(pinned.getTime())) throw new Error(`MOCK_NOW is not a valid date: ${mockNow}`);
  return pinned;
}
