import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { type AdminArea, can, signOut } from '@/features/auth';
import { requireStaff } from '@/features/auth/server';
import { badgeCounts, getDashboard } from '@/features/dashboard/server';
import { ADMIN_NAV } from '@/shared/config/admin-nav';
import { isEnabled } from '@/shared/config/flags';
import { AdminShell } from '@/shared/layout/admin/admin-shell';

async function GuardedShell({ children }: { children: React.ReactNode }) {
  const session = await requireStaff();
  const [dashboard, t] = await Promise.all([getDashboard(session), getTranslations('admin.roles')]);
  const counts = badgeCounts(session, dashboard);
  const phase2 = isEnabled('phase2');

  // Only sections this admin may open (D18); Phase 2 sections only when member accounts are on.
  const groups = ADMIN_NAV.map((group) => ({
    key: group.key,
    items: group.items
      .filter((item) => (phase2 || !item.phase2) && can(session, 'view', item.area as AdminArea))
      .map((item) => ({
        key: item.key,
        href: item.href,
        count: item.count ? counts[item.count] : undefined,
      })),
  })).filter((group) => group.items.length > 0);

  return (
    <AdminShell
      groups={groups}
      user={{ name: session.name, initials: session.initials, roleLabel: t(session.adminRole!) }}
      signOutAction={signOut}
    >
      {children}
    </AdminShell>
  );
}

/** Every admin screen: session guard (redirects to /admin/login) + the shell. Dynamic, so in Suspense. */
export default function PanelLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-surface" aria-busy="true" />}>
      <GuardedShell>{children}</GuardedShell>
    </Suspense>
  );
}
