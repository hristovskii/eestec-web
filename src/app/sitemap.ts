import type { MetadataRoute } from 'next';

import { getArchiveSlugs, getUpcomingSlugs } from '@/features/events/server';
import { getMemorySlugs } from '@/features/memories/server';
import { listPublicUsernames } from '@/features/members/server';
import { publicPagePaths } from '@/features/settings/server';
import { isEnabled } from '@/shared/config/flags';
import { SITE_URL } from '@/shared/config/site';
import { buildSitemap } from '@/shared/seo/sitemap';

// The pages visitors can reach today (member pages only when accounts are on, with every public
// member profile) and every listed event at its current address: /upcoming/<slug> until it ends,
// /events/<slug> after. The other address is a 301, so it is never listed. Drafts and hidden events
// are not in these lists; members-only profiles are not either. Published Memories are listed.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const phase2 = isEnabled('phase2');
  const [upcoming, archive, usernames, memories] = await Promise.all([
    getUpcomingSlugs(),
    getArchiveSlugs(),
    phase2 ? listPublicUsernames() : [],
    phase2 ? getMemorySlugs() : [],
  ]);
  return buildSitemap(SITE_URL.origin, [
    ...publicPagePaths(phase2),
    ...usernames.map((username) => `/members/${username}`),
    ...memories.map((slug) => `/memories/${slug}`),
    ...upcoming.map((slug) => `/upcoming/${slug}`),
    ...archive.map((slug) => `/events/${slug}`),
  ]);
}
