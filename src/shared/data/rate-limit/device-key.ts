import 'server-only';

import { createHash } from 'node:crypto';

import { headers } from 'next/headers';

/** A hash of the caller's IP and browser, never the IP itself: the only thing the limiter keeps. */
export async function deviceKey(form: string): Promise<string> {
  const list = await headers();
  const ip = list.get('x-forwarded-for')?.split(',')[0]?.trim() ?? list.get('x-real-ip') ?? 'local';
  const agent = list.get('user-agent') ?? '';
  return createHash('sha256').update(`${form}|${ip}|${agent}`).digest('hex');
}
