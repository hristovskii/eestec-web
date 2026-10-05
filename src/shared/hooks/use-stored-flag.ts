'use client';

import { useCallback, useSyncExternalStore } from 'react';

// A per-viewer boolean in localStorage (e.g. "sidebar collapsed"). Storage can throw in private
// mode or be empty; the default is used then. Not for state that must persist reliably.
const EVENT = 'stored-flag-change';

function read(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function useStoredFlag(key: string): [boolean, (value: boolean) => void] {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener('storage', onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener(EVENT, onChange);
    };
  }, []);
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => false,
  );
  const set = useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, next ? '1' : '0');
      } catch {
        // ignore: the toggle still works for this page view
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );
  return [value, set];
}
