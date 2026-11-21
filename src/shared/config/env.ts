import 'server-only';

import { z } from 'zod';

import { DATA_SOURCES } from './data-source';

// Every variable is optional: the app must build and run with an empty environment.
const schema = z
  .object({
    DATA_SOURCE: z.enum(DATA_SOURCES).default('mock'),
    SUPABASE_URL: z.string().optional(),
    SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    // ISO date-time, or 'real' for the real clock. Default: the canvas moment (see shared/lib/clock).
    MOCK_NOW: z.string().optional(),
    MOCK_MULTIPLY: z.coerce.number().int().min(1).max(20).default(1),
    // Comma-separated flag names that are switched on, e.g. "phase2,adminSearch".
    FEATURE_FLAGS: z.string().default(''),
    // Show dev-only surfaces (/design-system) under `next start`, e.g. in CI e2e runs.
    ENABLE_DEV_SURFACES: z.enum(['true', 'false']).optional(),
    VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  })
  .superRefine((value, context) => {
    if (value.DATA_SOURCE !== 'supabase') return;
    for (const key of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] as const) {
      if (!value[key]?.trim())
        context.addIssue({ code: 'custom', path: [key], message: 'Required when DATA_SOURCE is supabase' });
    }
  });

export const parseEnv = (input: Record<string, string | undefined>) => schema.parse(input);
export const env = parseEnv(process.env);
