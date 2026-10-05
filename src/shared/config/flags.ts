import 'server-only';

import { env } from './env';

// Launch values live in code; FEATURE_FLAGS switches flags on (dev, preview, CI).
const defaults = {
  /** Member accounts, /members, /memories, /submit, approvals (Phase 2). */
  phase2: false,
  /** Memories map view (after launch). */
  memoriesMap: false,
  /** "Log in with eestec.net" (only if EESTEC International offers SSO). */
  eestecSso: false,
  /** Admin topbar ⌘K search (D5). */
  adminSearch: false,
  /** Admin topbar notifications bell (D5). */
  adminNotifications: false,
} as const;

export type Flag = keyof typeof defaults;

const enabled = new Set(
  env.FEATURE_FLAGS.split(',')
    .map((name) => name.trim())
    .filter(Boolean),
);

export function isEnabled(flag: Flag): boolean {
  return enabled.has(flag) || defaults[flag];
}

/** Dev-only surfaces (/design-system, devtools): local dev and Vercel previews, never production. */
export function devSurfacesEnabled(): boolean {
  if (env.VERCEL_ENV === 'production') return false;
  if (env.ENABLE_DEV_SURFACES) return env.ENABLE_DEV_SURFACES === 'true';
  if (env.VERCEL_ENV) return true;
  return env.NODE_ENV !== 'production';
}
