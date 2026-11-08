'use client';

import * as React from 'react';

/** idle: nothing to say yet; saved: the server has it; offline: only on this device; error: the last try failed. */
export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

type StoredCopy<T> = { savedAt: number; value: T };

/** The copy kept on this device (see `useAutosave`), or null. Safe to call where storage is blocked. */
export function readLocalCopy<T>(key: string): StoredCopy<T> | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoredCopy<T>) : null;
  } catch {
    return null;
  }
}

function writeLocalCopy<T>(key: string, value: T | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else
      window.localStorage.setItem(
        key,
        JSON.stringify({ savedAt: Date.now(), value } satisfies StoredCopy<T>),
      );
  } catch {
    // Storage is full or blocked (a private window): the server copy still works.
  }
}

const subscribeOnline = (notify: () => void) => {
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  return () => {
    window.removeEventListener('online', notify);
    window.removeEventListener('offline', notify);
  };
};

/**
 * Autosave for the Memory editor (docs/ARCHITECTURE.md): while the value has unsaved changes it is
 * sent to the server every `intervalMs` (10 s), and always kept on this device in `localStorage`, so a
 * closed tab or a lost connection loses nothing. Offline, the interval waits; coming back online
 * saves at once. `saveNow` is "Save draft" (and what runs before a preview or a submit).
 *
 * `save` returns true when the server has the value. `value` is compared as JSON.
 */
export function useAutosave<T>({
  value,
  enabled,
  save,
  storageKey,
  initialSaved,
  intervalMs = 10_000,
}: {
  value: T;
  /** false: only the copy on this device (a published Memory is edited without autosaving). */
  enabled: boolean;
  save: (value: T) => Promise<boolean>;
  storageKey: string;
  /** What the server has when the editor opens (to know whether there is anything to save). */
  initialSaved: T;
  intervalMs?: number;
}) {
  const [saved, setSaved] = React.useState(() => JSON.stringify(initialSaved));
  const [phase, setPhase] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const online = React.useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const current = JSON.stringify(value);
  const dirty = current !== saved;

  // Always-current values for the timer, which must not restart on every keystroke.
  const latest = React.useRef({ value, current, dirty, online, enabled, save });
  const saving = React.useRef(false);
  React.useEffect(() => {
    latest.current = { ...latest.current, value, current, dirty, online, enabled, save };
  });

  // The copy on this device follows the value while it differs from the server's.
  React.useEffect(() => {
    if (dirty) {
      const id = window.setTimeout(() => writeLocalCopy(storageKey, value), 400);
      return () => window.clearTimeout(id);
    }
    writeLocalCopy(storageKey, null);
  }, [dirty, value, storageKey]);

  const saveNow = React.useCallback(async (): Promise<boolean> => {
    const state = latest.current;
    if (!state.dirty) return true;
    if (!state.online || saving.current) return false;
    saving.current = true;
    setPhase('saving');
    let ok = false;
    try {
      ok = await state.save(state.value);
    } catch {
      ok = false;
    }
    saving.current = false;
    if (ok) {
      setSaved(state.current);
      setSavedAt(Date.now());
      setPhase('saved');
    } else setPhase('error');
    return ok;
  }, []);

  React.useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      if (latest.current.enabled && latest.current.dirty && latest.current.online) void saveNow();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs, saveNow]);

  // Back online: save what piled up.
  React.useEffect(() => {
    if (!online) return;
    const id = window.setTimeout(() => {
      if (latest.current.enabled && latest.current.dirty) void saveNow();
    }, 0);
    return () => window.clearTimeout(id);
  }, [online, saveNow]);

  const status: AutosaveStatus = !online && dirty ? 'offline' : phase === 'idle' ? 'idle' : phase;
  return {
    status,
    savedAt,
    dirty,
    saveNow,
    /** The server now has `value` (after a submit): nothing is unsaved. */
    markSaved: () => {
      setSaved(latest.current.current);
      writeLocalCopy(storageKey, null);
    },
  };
}
