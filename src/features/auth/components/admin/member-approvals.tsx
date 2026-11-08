import { SearchX } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { ApprovalRow } from '@/shared/admin-ui/approval-split-view';
import { formatDate } from '@/shared/i18n/format';
import { waitingTime } from '@/shared/lib/approvals';
import type { ApprovalsParams } from '@/shared/lib/approvals-params';
import { now } from '@/shared/lib/now';
import { EmptyState } from '@/shared/ui/empty-state';

import { decideRegistrations } from '../../actions/admin-approvals';
import { listMemberRegistrations } from '../../queries';
import { MemberApprovalsView } from './member-approvals-view';
import { MemberPreview } from './member-preview';

/** Admin › Approvals › Member registrations: the queue (confirmed sign-ups, oldest first) and the open one. */
export async function MemberApprovals({ params, canEdit }: { params: ApprovalsParams; canEdit: boolean }) {
  const [t, pending] = await Promise.all([
    getTranslations('admin.approvals'),
    listMemberRegistrations('pending'),
  ]);
  const current = now();
  const registrations = params.sort === 'newest' ? [...pending].reverse() : pending;

  const rows: ApprovalRow[] = registrations.map((registration) => ({
    id: registration.userId,
    kind: t('list.kind'),
    title: registration.name,
    extra: `${registration.faculty}, ${t(`detail.years.${registration.year}`)}`,
    when: `${waitingTime(registration.confirmedAt ?? registration.submittedAt, current)} ago`,
  }));
  const index = registrations.findIndex((registration) => registration.userId === params.open);
  const open = index >= 0 ? registrations[index] : undefined;

  return (
    <MemberApprovalsView
      rows={rows}
      openId={open?.userId ?? null}
      waitingLabel={t('list.waiting', { count: registrations.length })}
      decide={canEdit ? decideRegistrations : null}
      empty={
        <EmptyState
          variant="admin"
          icon={<SearchX className="size-6" aria-hidden />}
          title={t('empty.title')}
        >
          {t('empty.text')}
        </EmptyState>
      }
      detail={
        open && (
          <MemberPreview
            registration={open}
            position={{ index: index + 1, total: registrations.length }}
            previousId={registrations[index - 1]?.userId ?? null}
            nextId={registrations[index + 1]?.userId ?? null}
            waiting={waitingTime(open.confirmedAt ?? open.submittedAt, current)}
            submitted={formatDate(open.submittedAt, 'en', 'dateTime')}
            confirmed={open.confirmedAt ? formatDate(open.confirmedAt, 'en', 'dateTime') : null}
            decide={canEdit ? decideRegistrations : null}
          />
        )
      }
    />
  );
}
