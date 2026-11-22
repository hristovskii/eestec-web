import 'server-only';

import { env } from '@/shared/config/env';
import { devSurfacesEnabled } from '@/shared/config/flags';

import { listMockMail } from './data/mailbox';
import { readMockMemberPhoto } from '@/shared/data/mock/member-photos';

// Dev and preview only (mock data): the e-mails the member flow would send, and the photos chosen at
// sign-up. Production answers 404. On a real database the mailbox exists only on a developer's machine (no Vercel
// environment): a preview holds real people's links, which no address may list.

const available = () => devSurfacesEnabled() && env.DATA_SOURCE === 'mock';
const mailboxAvailable = () =>
  devSurfacesEnabled() && (env.DATA_SOURCE === 'mock' || (env.DATA_SOURCE === 'supabase' && !env.VERCEL_ENV));
const notFound = () => new Response('Not found', { status: 404 });

/** GET /api/dev-mailbox?to=<address>: newest first. */
export function mockMailboxResponse(url: URL): Response {
  if (!mailboxAvailable()) return notFound();
  return Response.json({ mail: listMockMail(url.searchParams.get('to') ?? undefined) });
}

/** GET /api/dev-member-photos/[id]. */
export function mockMemberPhotoResponse(id: string): Response {
  if (!available()) return notFound();
  const photo = readMockMemberPhoto(id);
  if (!photo) return notFound();
  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      'Content-Type': photo.mimeType,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
