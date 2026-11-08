import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { can } from '@/features/auth';
import { MemberApprovals } from '@/features/auth/admin';
import { getPendingRegistrationSummary, requirePermission } from '@/features/auth/server';
import { ApprovalSort } from '@/shared/admin-ui/approval-split-view';
import { AdminPage, AdminPageHeader, AdminTabs, TablePanel } from '@/shared/admin-ui/admin-page';
import { AdminPageCrumb } from '@/shared/layout/admin/admin-shell';
import { APPROVAL_TYPES, approvalsParamsSchema } from '@/shared/lib/approvals-params';
import { hrefWithParams } from '@/shared/lib/search-params';

export const metadata: Metadata = { title: 'Approvals' };

/** The red count next to a tab: what is waiting for a decision (red counts that need action are allowed). */
function WaitingPill({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex h-5 items-center rounded-full bg-brand px-2 text-[12px] font-bold text-white">
      {count}
    </span>
  );
}

async function Approvals({ searchParams }: { searchParams: PageProps<'/admin/approvals'>['searchParams'] }) {
  const session = await requirePermission('view', 'approvals');
  const params = approvalsParamsSchema.parse(await searchParams);
  const [t, members] = await Promise.all([
    getTranslations('admin.approvals'),
    getPendingRegistrationSummary(),
  ]);
  const counts: Record<(typeof APPROVAL_TYPES)[number], number> = { members: members.count };

  return (
    <AdminPage>
      <AdminPageCrumb label={t(`tabs.${params.type}`)} />
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <ApprovalSort
            label={t('sortLabel')}
            value={params.sort}
            options={[
              { value: 'oldest', label: t('sort.oldest') },
              { value: 'newest', label: t('sort.newest') },
            ]}
          />
        }
      />
      <TablePanel>
        <AdminTabs
          label={t('tabsLabel')}
          tabs={APPROVAL_TYPES.map((type) => ({
            href: hrefWithParams('/admin/approvals', '', { type }),
            current: params.type === type,
            label: (
              <>
                {t(`tabs.${type}`)}
                <WaitingPill count={counts[type]} />
              </>
            ),
          }))}
        />
        {params.type === 'members' && (
          <MemberApprovals params={params} canEdit={can(session, 'edit', 'approvals')} />
        )}
      </TablePanel>
    </AdminPage>
  );
}

// Reads the session and the URL: dynamic, so inside Suspense.
export default function ApprovalsPage(props: PageProps<'/admin/approvals'>) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Approvals searchParams={props.searchParams} />
    </Suspense>
  );
}
