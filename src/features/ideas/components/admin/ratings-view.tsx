import { Star } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { type Actor } from '@/features/auth';
import { formatDate } from '@/shared/i18n/format';
import { cn } from '@/shared/lib/cn';
import { EmptyState } from '@/shared/ui/empty-state';

import { getRatings } from '../../admin-queries';
import { academicYearLabel } from '../../domain/academic-year';
import type { AdminIdeasParams } from '../../schemas/admin-ideas-params.schema';
import { YearSelect } from './idea-controls';

/** Stars filled in red up to the average (the canvas fills a star when the rest is at least .75). */
function AverageStars({ average }: { average: number }) {
  return (
    <span className="flex" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            'size-4',
            average - n + 1 >= 0.75 ? 'fill-brand text-brand' : 'fill-line-strong text-line-strong',
          )}
        />
      ))}
    </span>
  );
}

/** Admin › Ideas & Feedback › Ratings per event: average, spread and the latest comment of each event. */
export async function RatingsView({ params, actor }: { params: AdminIdeasParams; actor: Actor }) {
  const [t, data] = await Promise.all([getTranslations('admin.ideas.ratings'), getRatings(actor, params)]);
  const options = [
    ...data.years.map((year) => ({
      value: String(year),
      label: t('year', { year: academicYearLabel(year) }),
    })),
    { value: 'all', label: t('allTime') },
  ];
  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-divider px-4 py-3.5 md:px-5">
        <YearSelect label={t('yearLabel')} value={String(data.selected)} options={options} />
        {data.average !== null && (
          <p className="text-small text-ink-2">
            {t('average')} <strong className="text-[17px] text-ink">{data.average.toFixed(1)}</strong>{' '}
            <span className="text-muted-ink">{t('from', { count: data.total })}</span>
          </p>
        )}
      </div>
      {data.rows.length === 0 ? (
        <EmptyState variant="admin" icon={<Star />} title={t('emptyTitle')}>
          {t('emptyText')}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-small">
            <caption className="sr-only">{t('table')}</caption>
            <thead>
              <tr className="border-b border-divider text-[13px] text-muted-ink">
                <th scope="col" className="px-5 py-3 font-medium">
                  {t('columns.event')}
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  {t('columns.responses')}
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  {t('columns.average')}
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  {t('columns.spread')}
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  {t('columns.latest')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => {
                const most = Math.max(...row.distribution, 1);
                return (
                  <tr key={row.key} className="border-b border-divider align-top">
                    <th scope="row" className="px-5 py-4 text-left font-medium">
                      <span className="block">{row.eventTitle}</span>
                      <span className="text-[13px] font-normal text-muted-ink">
                        {formatDate(row.latestAt, 'en', 'monthYearShort')}
                      </span>
                    </th>
                    <td className="px-3 py-4">{row.count}</td>
                    <td className="px-3 py-4">
                      <span className="flex items-center gap-2">
                        <AverageStars average={row.average} />
                        <strong className="text-[15px]">{row.average.toFixed(1)}</strong>
                        <span className="sr-only">{t('averageOf', { value: row.average.toFixed(1) })}</span>
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <ul className="m-0 flex w-44 list-none flex-col gap-1 p-0">
                        {[5, 4, 3, 2, 1].map((stars) => {
                          const count = row.distribution[stars - 1] ?? 0;
                          return (
                            <li
                              key={stars}
                              className="flex items-center gap-2 text-[12px] text-muted-ink"
                              aria-label={t('spread', { stars, count })}
                            >
                              <span aria-hidden className="w-2.5">
                                {stars}
                              </span>
                              <span
                                aria-hidden
                                className="h-2 flex-1 overflow-hidden rounded-full bg-surface"
                              >
                                <span
                                  className="block h-full rounded-full bg-brand"
                                  style={{ width: `${Math.round((count / most) * 100)}%` }}
                                />
                              </span>
                              <span aria-hidden className="w-5 text-right">
                                {count}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                    <td className="px-5 py-4">
                      {row.latestComment ? (
                        <span className="flex max-w-96 flex-col gap-1">
                          <span className="text-ink-2">“{row.latestComment.text}”</span>
                          <Link
                            href={`/admin/ideas?tab=feedback&event=${encodeURIComponent(row.key)}`}
                            className="text-[13px] font-medium text-brand-dark hover:underline"
                          >
                            {t('comments', { count: row.count })}
                          </Link>
                        </span>
                      ) : (
                        <span className="text-muted-ink">{t('noComment')}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
