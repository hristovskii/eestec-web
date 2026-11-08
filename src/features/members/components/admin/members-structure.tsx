'use client';

import { useTranslations } from 'next-intl';

import { AdminPage, AdminPageHeader, TablePanel } from '@/shared/admin-ui/admin-page';

import type { BadgeWithCount, BoardMandate, BoardPerson, TeamWithCount } from '../../types';
import { BadgesAdmin } from './badges-admin';
import { BoardAdmin } from './board-admin';
import { MembersSections } from './members-admin';
import { TeamsAdmin } from './teams-admin';

type Props = { canEdit: boolean } & (
  | { section: 'teams'; teams: TeamWithCount[] }
  | { section: 'badges'; badges: BadgeWithCount[] }
  | {
      section: 'board';
      mandates: BoardMandate[];
      people: BoardPerson[];
      roles: { id: string; title: string; email: string }[];
      selected: string | undefined;
    }
);

/** Admin › Members › Teams, Badges and Board: the lists the profiles draw from. */
export function MembersStructure(props: Props) {
  const t = useTranslations('admin.members');
  return (
    <AdminPage>
      <AdminPageHeader title={t('title')} description={t('description')} />
      <MembersSections current={props.section} />
      <TablePanel>
        {props.section === 'teams' && <TeamsAdmin teams={props.teams} canEdit={props.canEdit} />}
        {props.section === 'badges' && <BadgesAdmin badges={props.badges} canEdit={props.canEdit} />}
        {props.section === 'board' && (
          <BoardAdmin
            mandates={props.mandates}
            people={props.people}
            roles={props.roles}
            selected={props.selected}
            canEdit={props.canEdit}
          />
        )}
      </TablePanel>
    </AdminPage>
  );
}
