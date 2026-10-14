import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { can } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';
import { ContactInbox } from '@/features/contact/admin';
import { countNewMessages } from '@/features/contact/server';
import { MembershipInbox } from '@/features/join/admin';
import { countNewApplications } from '@/features/join/server';
import { PartnersInbox } from '@/features/partners/admin';
import { countNewInquiries } from '@/features/partners/server';
import { AdminPage, AdminPageHeader, AdminTabs, TablePanel } from '@/shared/admin-ui/admin-page';
import { ExportPopover } from '@/shared/admin-ui/export-popover';
import { AdminPageCrumb } from '@/shared/layout/admin/admin-shell';
import { type InboxTab, INBOX_TABS, inboxParamsSchema } from '@/shared/lib/inbox-params';
import { hrefWithParams } from '@/shared/lib/search-params';

export const metadata: Metadata = { title: 'Inbox' };

/** The red "5 new" next to a tab: what still needs an answer (red counts that need action are allowed). */
function NewPill({ count, label }: { count: number; label: string }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex h-5 items-center rounded-full bg-brand px-2 text-[12px] font-bold text-white">
      {label}
    </span>
  );
}

async function Inbox({ searchParams }: { searchParams: PageProps<'/admin/inbox'>['searchParams'] }) {
  const session = await requirePermission('view', 'inbox');
  const params = inboxParamsSchema.parse(await searchParams);
  const canEdit = can(session, 'edit', 'inbox');
  const [t, contact, partners, membership] = await Promise.all([
    getTranslations('admin.inbox'),
    countNewMessages(),
    countNewInquiries(),
    countNewApplications(),
  ]);
  const newCounts: Record<InboxTab, number> = { contact, partners, membership };
  const tabHref = (tab: InboxTab) =>
    hrefWithParams('/admin/inbox', '', { tab: tab === 'contact' ? null : tab });

  // What the list is filtered by, in words ("New · Membership · “belgrade”"), for the export panel.
  const activeFilter =
    [
      params.status && t(`status.${params.status as 'new'}`),
      params.subject && t('filters.subject'),
      params.q && `“${params.q}”`,
    ]
      .filter(Boolean)
      .join(' · ') || null;

  return (
    <AdminPage>
      <AdminPageCrumb label={t(`tabs.${params.tab}`)} />
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <ExportPopover
            key={params.tab}
            kind={params.tab}
            resource={`inbox-${params.tab}`}
            currentFilter={activeFilter}
          />
        }
      />
      <TablePanel>
        <AdminTabs
          label={t('tabsLabel')}
          tabs={INBOX_TABS.map((tab) => ({
            href: tabHref(tab),
            current: params.tab === tab,
            label: (
              <>
                {t(`tabs.${tab}`)}
                <NewPill count={newCounts[tab]} label={t('newCount', { count: newCounts[tab] })} />
              </>
            ),
          }))}
        />
        {params.tab === 'contact' && <ContactInbox params={params} canEdit={canEdit} />}
        {params.tab === 'partners' && <PartnersInbox params={params} canEdit={canEdit} />}
        {params.tab === 'membership' && <MembershipInbox params={params} canEdit={canEdit} />}
      </TablePanel>
    </AdminPage>
  );
}

// Reads the session and the URL: dynamic, so inside Suspense.
export default function InboxPage(props: PageProps<'/admin/inbox'>) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Inbox searchParams={props.searchParams} />
    </Suspense>
  );
}
