import 'server-only';

import { z } from 'zod';

import { DATA_SOURCES } from './data-source';

// Every variable is optional: the app must build and run with an empty environment.
const schema = z.object({
  DATA_SOURCE: z.enum(DATA_SOURCES).default('mock'),
  // ISO date-time, or 'real' for the real clock. Default: the canvas moment (see shared/lib/clock).
  MOCK_NOW: z.string().optional(),
  MOCK_MULTIPLY: z.coerce.number().int().min(1).max(20).default(1),
  // Comma-separated flag names that are switched on, e.g. "phase2,adminSearch".
  FEATURE_FLAGS: z.string().default(''),
  // Show dev-only surfaces (/design-system) under `next start`, e.g. in CI e2e runs.
  ENABLE_DEV_SURFACES: z.enum(['true', 'false']).optional(),
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = schema.parse(process.env);
