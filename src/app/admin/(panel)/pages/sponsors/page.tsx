import type { Metadata } from 'next';
import { Suspense } from 'react';

import { can } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';
import { PARTNERS_TABS, PartnersAdmin } from '@/features/partners/admin';
import { getPartnersForEdit } from '@/features/partners/server';

export const metadata: Metadata = { title: 'Sponsors' };

async function Sponsors({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requirePermission('view', 'pages');
  const { tab } = await searchParams;
  const { page, tiers, sponsors, media, today } = await getPartnersForEdit();
  return (
    <PartnersAdmin
      tab={PARTNERS_TABS.find((known) => known === tab) ?? 'page'}
      page={page}
      tiers={tiers}
      sponsors={sponsors}
      media={media}
      today={today}
      canEdit={can(session, 'edit', 'pages')}
    />
  );
}

// Reads the session and the URL: dynamic, so inside Suspense.
export default function SponsorsAdminPage(props: PageProps<'/admin/pages/sponsors'>) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Sponsors searchParams={props.searchParams} />
    </Suspense>
  );
}
