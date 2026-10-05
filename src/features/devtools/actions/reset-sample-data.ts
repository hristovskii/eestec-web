'use server';

import { revalidatePath } from 'next/cache';

import { env } from '@/shared/config/env';
import { devSurfacesEnabled } from '@/shared/config/flags';
import { resetMockStore } from '@/shared/data/mock/store';

/** Devtools only: restore every mock table to its fixtures and drop cached pages. */
export async function resetSampleData(): Promise<void> {
  if (!devSurfacesEnabled() || env.DATA_SOURCE !== 'mock')
    throw new Error('Resetting sample data is dev-only.');
  resetMockStore();
  revalidatePath('/', 'layout');
  return Promise.resolve();
}
