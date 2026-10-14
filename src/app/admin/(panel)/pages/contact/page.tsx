import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { can } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';
import { ContactAdmin } from '@/features/contact/admin';
import { getContactForEdit } from '@/features/contact/server';
import { PrivacyAdmin } from '@/features/settings/admin';
import { getPrivacyForEdit } from '@/features/settings/server';
import { AdminTabs, TablePanel } from '@/shared/admin-ui/admin-page';

export const metadata: Metadata = { title: 'Contact' };

const TABS = ['page', 'privacy'] as const;

async function Contact({
  searchParams,
}: {
  searchParams: PageProps<'/admin/pages/contact'>['searchParams'];
}) {
  const session = await requirePermission('view', 'pages');
  const { tab: requested } = await searchParams;
  const tab = TABS.find((known) => known === requested) ?? 'page';
  const canEdit = can(session, 'edit', 'pages');
  const t = await getTranslations('admin.contact.tabs');
  const tabs = (
    <TablePanel>
      <AdminTabs
        label={t('label')}
        tabs={TABS.map((id) => ({
          href: id === 'page' ? '/admin/pages/contact' : `/admin/pages/contact?tab=${id}`,
          label: t(id),
          current: tab === id,
        }))}
      />
    </TablePanel>
  );
  if (tab === 'privacy')
    return <PrivacyAdmin record={await getPrivacyForEdit()} canEdit={canEdit} tabs={tabs} />;
  const { contact } = await getContactForEdit();
  return <ContactAdmin record={contact} canEdit={canEdit} tabs={tabs} />;
}

// Reads the session and the URL: dynamic, so inside Suspense.
export default function ContactAdminPage(props: PageProps<'/admin/pages/contact'>) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Contact searchParams={props.searchParams} />
    </Suspense>
  );
}
