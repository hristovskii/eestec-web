'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

// Client "now". With mock data the server clock is pinned to the canvas moment; the client
// follows the same pin (offset from the real clock) so countdowns match the server render.
const PinnedNowContext = createContext<string | null>(null);

export function ClockProvider({
  pinnedNow,
  children,
}: {
  pinnedNow: string | null;
  children: React.ReactNode;
}) {
  return <PinnedNowContext value={pinnedNow}>{children}</PinnedNowContext>;
}

/**
 * Current time, ticking every `intervalMs`. Returns `initial` until mounted, so the first
 * client render matches the server render (no hydration mismatch).
 */
export function useNow(initial: Date, intervalMs = 1000): Date {
  const pinnedNow = useContext(PinnedNowContext);
  const [now, setNow] = useState(initial);

  useEffect(() => {
    const offset = pinnedNow ? new Date(pinnedNow).getTime() - Date.now() : 0;
    const tick = () => setNow(new Date(Date.now() + offset));
    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [pinnedNow, intervalMs]);

  return now;
}

/**
 * Reads "now" on demand, for timestamps taken in event handlers (e.g. "Saved · just now").
 * Follows the same pin as useNow, so both agree.
 */
export function useClockNow(): () => Date {
  const pinnedNow = useContext(PinnedNowContext);
  const mountedAt = useRef(0);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);
  return () => {
    if (!pinnedNow) return new Date();
    const offset = new Date(pinnedNow).getTime() - (mountedAt.current || Date.now());
    return new Date(Date.now() + offset);
  };
}
