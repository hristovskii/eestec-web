import { Check, ChevronLeft, ChevronRight, Minus } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import * as React from 'react';

import { AdminBadge } from '@/shared/admin-ui/admin-page';
import { hrefWithParams } from '@/shared/lib/search-params';

import { photoUrl } from '../../data/member-photos';
import { checksOf } from '../../domain/registration-checks';
import type { MemberRegistration } from '../../types';
import { MemberDecision } from './member-decision';
import type { DecideAction } from './member-approvals-view';

/** The open registration (AdminApprovals › preview): who, what they entered, the checks, and the decision bar. */
export async function MemberPreview({
  registration,
  position,
  previousId,
  nextId,
  waiting,
  submitted,
  confirmed,
  decide,
}: {
  registration: MemberRegistration;
  position: { index: number; total: number };
  previousId: string | null;
  nextId: string | null;
  /** "5 h". */
  waiting: string;
  submitted: string;
  confirmed: string | null;
  decide: DecideAction | null;
}) {
  const t = await getTranslations('admin.approvals.detail');
  const checks = checksOf(registration);
  const href = (id: string) => hrefWithParams('/admin/approvals', '', { open: id });
  const none = <span className="text-muted-ink">{t('none')}</span>;
  const fields: [string, React.ReactNode][] = [
    [t('email'), registration.email],
    [t('faculty'), registration.faculty],
    [t('year'), t(`years.${registration.year}`)],
    [t('phone'), registration.phone || none],
    [t('visibility'), t(`visibilityValue.${registration.visibility}`)],
    [t('submitted'), submitted],
    [t('confirmed'), confirmed ?? none],
  ];
  const lines: { ok: boolean; text: string }[] = [
    { ok: checks.confirmedEmail, text: t('check.confirmed') },
    { ok: checks.facultyEmail, text: checks.facultyEmail ? t('check.domainYes') : t('check.domainNo') },
    { ok: checks.hasPhoto, text: checks.hasPhoto ? t('check.photoYes') : t('check.photoNo') },
    { ok: true, text: t('check.consent') },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-4 py-3 lg:px-6">
        <span className="flex flex-wrap items-center gap-3">
          <AdminBadge tone="attention">{t('waiting', { time: waiting })}</AdminBadge>
          <span className="text-small text-muted-ink">
            {t.rich('by', {
              name: registration.name,
              strong: (chunks) => <strong className="text-ink">{chunks}</strong>,
            })}
          </span>
        </span>
        <span className="flex items-center gap-1 text-small text-muted-ink">
          {t('position', { index: position.index, total: position.total })}
          {previousId ? (
            <Link
              href={href(previousId) as never}
              scroll={false}
              aria-label={t('previous')}
              className="flex size-8 items-center justify-center rounded-sm hover:bg-surface"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
          ) : (
            <span aria-hidden className="flex size-8 items-center justify-center opacity-30">
              <ChevronLeft className="size-4" />
            </span>
          )}
          {nextId ? (
            <Link
              href={href(nextId) as never}
              scroll={false}
              aria-label={t('next')}
              className="flex size-8 items-center justify-center rounded-sm hover:bg-surface"
            >
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span aria-hidden className="flex size-8 items-center justify-center opacity-30">
              <ChevronRight className="size-4" />
            </span>
          )}
        </span>
      </div>

      <article className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        <div className="flex items-center gap-4">
          {registration.photoId ? (
            // The photo chosen at sign-up, from the mock store (dev and preview only): nothing to optimise.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl(registration.photoId)}
              alt={t('photoAlt', { name: registration.name })}
              className="size-20 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-surface text-small text-muted-ink">
              {t('noPhoto')}
            </span>
          )}
          <h2 className="text-[22px] leading-tight font-bold">{registration.name}</h2>
        </div>

        <dl className="m-0 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-small text-muted-ink">{label}</dt>
              <dd className="m-0 font-medium break-words">{value}</dd>
            </div>
          ))}
        </dl>

        <section aria-label={t('checks')} className="flex flex-col gap-2 rounded-md bg-surface px-4 py-3.5">
          <strong className="text-small">{t('checks')}</strong>
          {lines.map((line) => (
            <span key={line.text} className="flex items-center gap-2 text-small">
              {line.ok ? (
                <Check className="size-4 text-ink" aria-hidden />
              ) : (
                <Minus className="size-4 text-muted-ink" aria-hidden />
              )}
              <span className={line.ok ? undefined : 'text-muted-ink'}>{line.text}</span>
            </span>
          ))}
        </section>
      </article>

      <MemberDecision
        userId={registration.userId}
        name={registration.name}
        email={registration.email}
        decide={decide}
      />
    </>
  );
}
