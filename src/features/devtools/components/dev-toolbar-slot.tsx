import 'server-only';

import { getMockPersonaId, listMockMail, listMockPersonas } from '@/features/auth/server';
import { env } from '@/shared/config/env';
import { devSurfacesEnabled, isEnabled } from '@/shared/config/flags';
import { pinnedNow } from '@/shared/lib/now';

import { DevToolbar } from './dev-toolbar';

/** Server part of the dev toolbar. Reads the session cookie: render it inside <Suspense>. */
export async function DevToolbarSlot() {
  if (!devSurfacesEnabled() || env.DATA_SOURCE !== 'mock') return null;
  return (
    <DevToolbar
      personas={listMockPersonas()}
      currentPersonaId={await getMockPersonaId()}
      pinnedNow={pinnedNow()}
      phase2={isEnabled('phase2')}
      mail={listMockMail()
        .slice(0, 6)
        .map(({ id, to, kind, link, reason }) => ({ id, to, kind, link, reason }))}
    />
  );
}
