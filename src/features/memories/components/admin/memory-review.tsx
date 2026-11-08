import { Check, ChevronLeft, ChevronRight, Minus } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import * as React from 'react';

import { AdminBadge } from '@/shared/admin-ui/admin-page';
import { formatDate } from '@/shared/i18n/format';
import { hrefWithParams } from '@/shared/lib/search-params';
import { MediaImage } from '@/shared/ui/media-image';
import { RichText } from '@/shared/ui/rich-text';

import type { MemoryReviewView } from '../../admin-queries';
import { MemoryDecision } from './memory-decision';

/**
 * The open Memory (AdminApprovals › preview): how it will look, what changed (for changes to a
 * published one), the facts, the checks, "Feature on the Home page" and the decision bar.
 */
export async function MemoryReview({
  review,
  author,
  position,
  previousId,
  nextId,
  waiting,
  canDecide,
}: {
  review: MemoryReviewView;
  /** From `members` (the route asks): null for a former member. */
  author: { name: string; since: number } | null;
  position: { index: number; total: number };
  previousId: string | null;
  nextId: string | null;
  /** "5 h". */
  waiting: string;
  canDecide: boolean;
}) {
  const t = await getTranslations('admin.approvals.memories');
  const name = author?.name ?? t('former');
  const href = (id: string) => hrefWithParams('/admin/approvals', '', { open: id });
  const pager = (id: string | null, direction: 'previous' | 'next') => {
    const Icon = direction === 'previous' ? ChevronLeft : ChevronRight;
    return id ? (
      <Link
        href={href(id) as never}
        scroll={false}
        aria-label={t(`detail.${direction}`)}
        className="flex size-8 items-center justify-center rounded-sm hover:bg-surface"
      >
        <Icon className="size-4" aria-hidden />
      </Link>
    ) : (
      <span aria-hidden className="flex size-8 items-center justify-center opacity-30">
        <Icon className="size-4" />
      </span>
    );
  };
  const checks: { ok: boolean; text: string }[] = [
    {
      ok: review.checks.coverAlt,
      text: review.checks.coverAlt ? t('detail.check.coverAlt') : t('detail.check.coverNo'),
    },
    {
      ok: review.checks.realEvent,
      text: review.checks.realEvent ? t('detail.check.event') : t('detail.check.eventNo'),
    },
    {
      ok: review.checks.missingPhotoAlt === 0,
      text:
        review.checks.missingPhotoAlt === 0
          ? t('detail.check.photoAlt')
          : t('detail.check.photoAltNo', { count: review.checks.missingPhotoAlt }),
    },
  ];
  const shown = review.photos.slice(0, 4);
  const more = review.photos.length - shown.length;
  const meta = [name, formatDate(review.submittedAt, 'en', 'date'), review.place, review.eventTitle].filter(
    Boolean,
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-4 py-3 lg:px-6">
        <span className="flex flex-wrap items-center gap-3">
          <AdminBadge tone="attention">{t('detail.waiting', { time: waiting })}</AdminBadge>
          <span className="text-small text-muted-ink">
            {t.rich(review.kind === 'revision' ? 'detail.byRevision' : 'detail.by', {
              name,
              strong: (chunks) => <strong className="text-ink">{chunks}</strong>,
            })}
          </span>
        </span>
        <span className="flex items-center gap-1 text-small text-muted-ink">
          {t('detail.position', { index: position.index, total: position.total })}
          {pager(previousId, 'previous')}
          {pager(nextId, 'next')}
        </span>
      </div>

      <article className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        {review.kind === 'revision' && review.changes.length > 0 && (
          <section
            aria-label={t('detail.changesTitle')}
            className="flex flex-col gap-2 rounded-md border border-brand/35 bg-brand-tint px-4 py-3.5"
          >
            <strong className="text-small">{t('detail.changesTitle')}</strong>
            <ul className="flex flex-wrap gap-2">
              {review.changes.map((change) => (
                <li key={change}>
                  <AdminBadge tone="attention">{t(`detail.changes.${change}`)}</AdminBadge>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-label={t('detail.preview')} className="flex flex-col gap-3">
          <p className="text-small font-medium text-muted-ink">{t('detail.preview')}</p>
          <div className="overflow-hidden rounded-md border border-line">
            <div className="relative aspect-[16/7] bg-divider">
              {review.cover ? (
                <MediaImage media={review.cover} preset="cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-small text-muted-ink">
                  {t('detail.noCover')}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-3 p-4 lg:p-5">
              <h2 className="text-[22px] leading-tight font-bold">{review.title}</h2>
              <p className="text-small text-muted-ink">{meta.join(' · ')}</p>
              <div className="max-h-[320px] overflow-y-auto">
                <RichText html={review.body} className="text-[15px]" />
              </div>
              {shown.length > 0 && (
                <ul className="grid grid-cols-5 gap-2">
                  {shown.map((photo, index) => (
                    <li key={index} className="relative aspect-[4/3] overflow-hidden rounded-sm bg-divider">
                      <MediaImage media={photo} preset="thumb" />
                    </li>
                  ))}
                  {more > 0 && (
                    <li className="flex aspect-[4/3] items-center justify-center rounded-sm bg-surface text-small font-bold">
                      {t('detail.morePhotos', { count: more })}
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </section>

        <dl className="m-0 grid gap-x-8 gap-y-3 sm:grid-cols-2" aria-label={t('detail.facts')}>
          <div className="min-w-0">
            <dt className="text-small text-muted-ink">{t('detail.event')}</dt>
            <dd className="m-0 font-medium break-words">
              {review.eventId ? (
                <Link href={`/admin/events/${review.eventId}` as never} className="text-brand-dark underline">
                  {review.eventTitle}
                </Link>
              ) : (
                t('detail.eventOther', { name: review.eventTitle })
              )}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-small text-muted-ink">{t('detail.place')}</dt>
            <dd className="m-0 font-medium">
              {[
                review.place,
                review.happenedOn ? formatDate(review.happenedOn, 'en', 'date') : t('detail.noDate'),
              ]
                .filter(Boolean)
                .join(' · ')}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-small text-muted-ink">{t('detail.length')}</dt>
            <dd className="m-0 font-medium">
              {t('detail.lengthValue', { words: review.words, photos: review.photos.length })}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-small text-muted-ink">{t('detail.earlier')}</dt>
            <dd className="m-0 font-medium">
              {review.authorApproved > 0
                ? t('detail.earlierValue', { count: review.authorApproved })
                : t('detail.earlierNone')}
            </dd>
          </div>
        </dl>

        <section
          aria-label={t('detail.checks')}
          className="flex flex-col gap-2 rounded-md bg-surface px-4 py-3.5"
        >
          <strong className="text-small">{t('detail.checks')}</strong>
          {checks.map((line) => (
            <span key={line.text} className="flex items-center gap-2 text-small">
              {line.ok ? (
                <Check className="size-4 text-ink" aria-hidden />
              ) : (
                <Minus className="size-4 text-brand-dark" aria-hidden />
              )}
              <span className={line.ok ? undefined : 'font-medium text-brand-dark'}>{line.text}</span>
            </span>
          ))}
        </section>
      </article>

      <MemoryDecision
        id={review.id}
        title={review.title}
        authorName={name}
        kind={review.kind}
        featuredInitial={review.featuredOnHome}
        canDecide={canDecide}
      />
    </>
  );
}
