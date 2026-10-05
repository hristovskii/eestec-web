import 'server-only';

import { env } from '@/shared/config/env';
import type { DataSource } from '@/shared/config/data-source';

/**
 * The mock sign-in (sample personas, one sample password) must never guard a production
 * deployment: there it shows "Admin not available yet", rejects every sign-in and ignores mock
 * session cookies. Local development and Vercel previews keep it.
 */
export function isMockSignInBlocked({
  dataSource,
  vercelEnv,
}: {
  dataSource: DataSource;
  vercelEnv: string | undefined;
}): boolean {
  return dataSource === 'mock' && vercelEnv === 'production';
}

export const mockSignInBlocked = () =>
  isMockSignInBlocked({ dataSource: env.DATA_SOURCE, vercelEnv: env.VERCEL_ENV });

/** Whether /admin/login accepts sign-ins on this deployment. */
export const adminSignInAvailable = () => !mockSignInBlocked();
