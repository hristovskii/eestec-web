import 'server-only';

import { membersRepository } from './data';
import { getAudience } from './queries';

/**
 * GET /api/member-photos/<user id>/<file id>.<ext>: a private profile photo, for whoever may see it. The repository
 * reads Storage as the viewer (a signed-in member with their session, anyone else as a visitor) and Storage allows
 * the file only where `can_read_avatar` does, so "not allowed" and "not there" are the same 404. Photos can be
 * hidden or moved to another audience at any time: browsers may keep one for a minute, never share it.
 */
export async function memberPhotoResponse(segments: readonly string[]): Promise<Response> {
  const audience = await getAudience();
  const repo = await membersRepository(audience === 'member' ? 'session' : 'public');
  const file = await repo.avatarFile(segments.join('/'));
  if (!file) return new Response(null, { status: 404 });
  return new Response(Buffer.from(file.bytes), {
    headers: {
      'Content-Type': file.mimeType,
      'Cache-Control': 'private, max-age=60',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
