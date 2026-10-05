import {
  ArrowRight,
  Calendar,
  Check,
  ClipboardList,
  Image as ImageIcon,
  Lightbulb,
  Mail,
  Plus,
  UserPlus,
  X,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { AdminPanel, StatCard } from '@/shared/admin-ui/stat-card';
import { formatDate, hourInSkopje } from '@/shared/i18n/format';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/primitives/button';

import type { DashboardData } from '../../types';

/** What this admin may see and do on the dashboard (from the permissions matrix, D18). */
export type DashboardAccess = {
  approvals: boolean;
  inbox: boolean;
  ideas: boolean;
  createEvent: boolean;
  pages: boolean;
  activityLog: boolean;
};

type AdminDashboardProps = {
  data: DashboardData;
  access: DashboardAccess;
  firstName: string;
  /** Server "now" (ISO): greeting, date, relative times. */
  now: string;
  /** Weekly meeting day, e.g. "Wednesday". */
  meetingDay: string;
  /** Recent activity (ActivityFeed from the activity feature, composed by the route). */
  activity?: ReactNode;
};

const linkClass =
  'inline-flex items-center gap-1 text-small font-medium text-brand-dark no-underline hover:underline';

function partOfDay(date: Date): 'morning' | 'afternoon' | 'evening' {
  const hour = hourInSkopje(date);
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
}

/** Admin › Dashboard (AdminDashboard, -Tablet, AdminMobileViews). */
export function AdminDashboard({
  data,
  access,
  firstName,
  now: nowIso,
  meetingDay,
  activity,
}: AdminDashboardProps) {
  const t = useTranslations('admin.dashboard');
  const format = useFormatter();
  const now = new Date(nowIso);
  const c = data.counters;
  const relative = (iso: string) => format.relativeTime(new Date(iso), now);

  const stats = [
    access.approvals && {
      key: 'members',
      href: '/admin/approvals?type=members',
      label: t('stats.memberRegistrations'),
      value: c.memberRegistrations.count,
      detail: c.memberRegistrations.oldestAt
        ? t('stats.oldest', { time: relative(c.memberRegistrations.oldestAt) })
        : undefined,
      icon: <UserPlus />,
      attention: c.memberRegistrations.count > 0,
    },
    access.approvals && {
      key: 'memories',
      href: '/admin/approvals?type=memories',
      label: t('stats.memoriesToApprove'),
      value: c.memoriesToApprove.count,
      detail: c.memoriesToApprove.oldestAt
        ? t('stats.oldest', { time: relative(c.memoriesToApprove.oldestAt) })
        : undefined,
      icon: <ImageIcon />,
      attention: c.memoriesToApprove.count > 0,
    },
    access.ideas && {
      key: 'ideas',
      href: '/admin/ideas',
      label: t('stats.ideas'),
      value: c.ideas.newIdeas + c.ideas.newFeedback,
      detail: t('stats.ideasDetail', { ideas: c.ideas.newIdeas, feedback: c.ideas.newFeedback }),
      icon: <Lightbulb />,
      attention: c.ideas.newIdeas + c.ideas.newFeedback > 0,
    },
    access.inbox && {
      key: 'membership',
      href: '/admin/inbox?tab=membership',
      label: t('stats.membershipApplications'),
      value: c.membershipApplications.count,
      detail: t('stats.sinceMeeting', { day: meetingDay }),
      icon: <ClipboardList />,
      attention: c.membershipApplications.count > 0,
    },
    access.inbox && {
      key: 'messages',
      href: '/admin/inbox',
      label: t('stats.messages'),
      value: c.messages.contact + c.messages.partners,
      detail: t('stats.messagesDetail', { contact: c.messages.contact, partners: c.messages.partners }),
      icon: <Mail />,
      attention: c.messages.contact + c.messages.partners > 0,
    },
    {
      key: 'applications',
      href: '/admin/applications',
      label: t('stats.openEventApplications'),
      value: c.openEventApplications.total,
      detail: t('stats.applicationsDetail', {
        events: c.openEventApplications.events,
        count: c.openEventApplications.newCount,
      }),
      icon: <Calendar />,
      attention: false,
    },
  ].filter((stat) => stat !== false);

  const attentionCount = stats.reduce((sum, stat) => sum + (stat.attention ? stat.value : 0), 0);
  const pendingCount = c.memberRegistrations.count + c.memoriesToApprove.count;

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 py-6 md:px-6 xl:px-8 xl:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] leading-tight font-bold">
            {t(`greeting.${partOfDay(now)}`, { name: firstName })}
          </h1>
          <p className="text-[15px] text-ink-2">
            {formatDate(now, 'en', 'long')}
            {attentionCount > 0 && (
              <>
                {' '}
                ·{' '}
                {t.rich('attention', {
                  count: attentionCount,
                  strong: (chunks) => <strong className="text-ink">{chunks}</strong>,
                })}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {access.approvals && (
            <Button asChild variant="quiet" size="sm">
              <Link href="/admin/approvals?type=memories">
                {t('quick.approveMemories')}
                {c.memoriesToApprove.count > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-tint px-1.5 text-[12px] font-bold text-brand-dark">
                    {c.memoriesToApprove.count}
                  </span>
                )}
              </Link>
            </Button>
          )}
          {access.pages && (
            <Button asChild variant="quiet" size="sm">
              <Link href="/admin/pages/sponsors?new=1">{t('quick.addSponsor')}</Link>
            </Button>
          )}
          {access.createEvent && (
            <Button asChild size="sm">
              <Link href="/admin/events/new">
                <Plus aria-hidden />
                {t('quick.addEvent')}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        {stats.map(({ key, ...stat }) => (
          <StatCard key={key} {...stat} attentionLabel={t('needsReview')} />
        ))}
      </div>

      {(access.approvals || activity) && (
        <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
          {access.approvals && (
            <AdminPanel
              title={t('pending.title')}
              action={
                <Link href="/admin/approvals" className={linkClass}>
                  {t('pending.openQueue', { count: pendingCount })}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              }
            >
              <ul className="divide-y divide-line">
                {data.pending.map((item) => {
                  const review = `/admin/approvals?type=${item.type === 'member' ? 'members' : 'memories'}&id=${item.id}`;
                  return (
                    <li key={item.id} className="flex items-center gap-4 px-5 py-3">
                      <span className="hidden w-20 shrink-0 sm:block">
                        <span className="inline-flex h-6 items-center rounded-full bg-surface px-2.5 text-[13px] font-medium">
                          {t(`pending.type.${item.type}`)}
                        </span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[15px] font-medium">{item.title}</span>
                        <span className="truncate text-[13px] text-muted-ink">
                          {item.meta} · {relative(item.submittedAt)}
                        </span>
                      </span>
                      <span className="flex shrink-0 gap-2">
                        <Link
                          href={review as Route}
                          aria-label={t('pending.reject', { title: item.title })}
                          className="hidden size-9 items-center justify-center rounded-sm border border-line-strong text-ink hover:border-ink sm:flex"
                        >
                          <X className="size-4" aria-hidden />
                        </Link>
                        <Link
                          href={review as Route}
                          aria-label={t('pending.approve', { title: item.title })}
                          className="hidden size-9 items-center justify-center rounded-sm border border-brand text-brand-dark hover:bg-brand-tint sm:flex"
                        >
                          <Check className="size-4" aria-hidden />
                        </Link>
                        <Button asChild variant="quiet" size="sm">
                          <Link href={review as Route}>{t('pending.review')}</Link>
                        </Button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </AdminPanel>
          )}
          {activity && (
            <AdminPanel
              title={t('activity.title')}
              action={
                access.activityLog ? (
                  <Link href="/admin/activity" className={linkClass}>
                    {t('activity.log')}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                ) : undefined
              }
            >
              {activity}
            </AdminPanel>
          )}
        </div>
      )}

      <AdminPanel
        title={t('openEvents.title')}
        action={
          <Link href="/admin/applications" className={linkClass}>
            {t('openEvents.all')}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      >
        {data.openEvents.length === 0 ? (
          <p className="px-5 py-6 text-small text-muted-ink">{t('openEvents.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <thead className="text-[12px] font-medium tracking-[0.06em] text-muted-ink uppercase">
                <tr className="border-b border-line">
                  <th scope="col" className="px-5 py-3 font-medium">
                    {t('openEvents.event')}
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    {t('openEvents.deadline')}
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    {t('openEvents.applications')}
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    {t('openEvents.places')}
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    {t('openEvents.status')}
                  </th>
                  <th scope="col" className="px-5 py-3">
                    <span className="sr-only">{t('openEvents.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.openEvents.map((row) => (
                  <tr key={row.eventId}>
                    <th scope="row" className="px-5 py-3.5 font-normal">
                      {row.title}
                    </th>
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      {formatDate(row.deadline, 'en', 'dateTime')}
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <strong>{row.total}</strong>{' '}
                      <span className="text-muted-ink">· {t('openEvents.new', { count: row.newCount })}</span>
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      {row.status === 'waitlist'
                        ? t('openEvents.full', { places: row.maxParticipants })
                        : row.maxParticipants}
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={cn(
                          'inline-flex h-6 items-center rounded-full px-2.5 text-[13px] font-medium whitespace-nowrap',
                          row.status === 'open' && 'bg-ink text-white',
                          row.status === 'deadline_soon' &&
                            'border border-brand bg-brand-tint text-brand-dark',
                          row.status === 'waitlist' && 'bg-surface text-ink',
                        )}
                      >
                        {t(`openEvents.statuses.${row.status}`)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button asChild variant="quiet" size="sm">
                        <Link
                          href={`/admin/applications?event=${row.eventId}` as Route}
                          aria-label={t('openEvents.view', { title: row.title })}
                        >
                          {t('openEvents.viewShort')}
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </div>
  );
}
