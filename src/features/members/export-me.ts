import 'server-only';

import { exportApplicationsOf } from '@/features/applications/server';
import { currentMember, exportMemberAccount, readMemberPhoto } from '@/features/auth/server';
import { now } from '@/shared/lib/now';

import { membersRepository } from './data';
import { buildMyDataZip } from './domain/export-zip';
import { getMineContext } from './my-profile';

/**
 * "Download my data": a ZIP of what the site stores about the signed-in member. Only the member's
 * own data, never cached; without a session there is nothing (401).
 */
export async function myDataResponse(): Promise<Response> {
  const session = await currentMember();
  if (!session) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const repo = await membersRepository('session');
  const at = now();
  const [mine, account, applications, cv] = await Promise.all([
    getMineContext(session).then((context) => repo.getMine(context, at.getFullYear())),
    exportMemberAccount(session.userId),
    exportApplicationsOf(session.email),
    repo.getCvFile(session.userId),
  ]);
  const photo = readMemberPhoto(mine.profile.photo?.src ?? null);
  const zip = buildMyDataZip({
    profile: mine.profile,
    account,
    consents: { ...mine.consents, cv: mine.cv },
    applications,
    photo: photo ? { bytes: photo.bytes, extension: photo.mimeType === 'image/png' ? 'png' : 'jpg' } : null,
    cv: cv?.bytes ? { bytes: cv.bytes } : null,
    exportedAt: at.toISOString(),
  });
  return new Response(Buffer.from(zip), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="eestec-my-data.zip"',
      'Cache-Control': 'no-store',
    },
  });
}
