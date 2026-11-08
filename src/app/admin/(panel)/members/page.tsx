import type { Metadata } from 'next';
import { Suspense } from 'react';

import { can } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';
import { listEventOptions } from '@/features/events/server';
import { adminMembersParamsSchema } from '@/features/members';
import { MembersAdmin, MembersStructure } from '@/features/members/admin';
import { getAdminBoards, listAdminBadges, listAdminMembers, listAdminTeams } from '@/features/members/server';

export const metadata: Metadata = { title: 'Members' };

async function Members({ searchParams }: { searchParams: PageProps<'/admin/members'>['searchParams'] }) {
  const session = await requirePermission('view', 'members');
  const params = adminMembersParamsSchema.parse(await searchParams);
  const canEdit = can(session, 'edit', 'members');

  if (params.tab === 'teams')
    return <MembersStructure section="teams" teams={await listAdminTeams()} canEdit={canEdit} />;
  if (params.tab === 'badges')
    return <MembersStructure section="badges" badges={await listAdminBadges()} canEdit={canEdit} />;
  if (params.tab === 'board') {
    const { mandates, people, roles } = await getAdminBoards();
    return (
      <MembersStructure
        section="board"
        mandates={mandates}
        people={people}
        roles={roles}
        selected={params.board}
        canEdit={canEdit}
      />
    );
  }

  const [{ page, counts, teams, badges }, events] = await Promise.all([
    listAdminMembers(params),
    listEventOptions(),
  ]);
  return (
    <MembersAdmin
      page={page}
      counts={counts}
      params={params}
      teams={teams}
      badges={badges}
      events={events.map(({ id, title }) => ({ id, title }))}
      canEdit={canEdit}
    />
  );
}

// Super admins and editors (D18). Reads the session and the URL: dynamic, so inside Suspense.
export default function MembersAdminPage({ searchParams }: PageProps<'/admin/members'>) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Members searchParams={searchParams} />
    </Suspense>
  );
}
