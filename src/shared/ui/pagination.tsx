import { ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';
import { pageItems } from '@/shared/lib/pagination';

type PaginationProps = {
  page: number;
  pageCount: number;
  /** Builds the URL for a page; filters stay in the URL (decided rule). */
  hrefForPage: (page: number) => string;
  /** Show "Back to top" on the right (desktop). */
  backToTop?: boolean;
};

const buttonClass =
  'inline-flex h-11 min-w-11 items-center justify-center rounded-sm border px-2.5 text-[15px] font-medium no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand';

/** Page numbers on desktop, prev / next + "Page X of Y" on mobile (EventsList). */
export function Pagination({ page, pageCount, hrefForPage, backToTop = true }: PaginationProps) {
  const t = useTranslations('ui.pagination');
  if (pageCount <= 1) return null;

  const prev = page > 1 ? hrefForPage(page - 1) : undefined;
  const next = page < pageCount ? hrefForPage(page + 1) : undefined;

  const arrow = (href: string | undefined, label: string, icon: ReactNode) =>
    href ? (
      <Link
        href={href}
        aria-label={label}
        className={cn(buttonClass, 'border-line text-ink hover:border-ink')}
      >
        {icon}
      </Link>
    ) : (
      <span
        aria-disabled="true"
        aria-label={label}
        role="link"
        className={cn(buttonClass, 'border-divider text-line-strong')}
      >
        {icon}
      </span>
    );

  return (
    <nav aria-label={t('label')} className="flex items-center justify-between gap-4">
      <span className="text-small text-muted-ink">{t('pageOf', { page, pageCount })}</span>
      <ol className="flex items-center gap-2">
        <li>{arrow(prev, t('previous'), <ChevronLeft className="size-5" aria-hidden />)}</li>
        {pageItems(page, pageCount).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden className="hidden px-1 text-muted-ink sm:block">
              …
            </li>
          ) : (
            <li key={item} className="hidden sm:block">
              <Link
                href={hrefForPage(item)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={t('page', { page: item })}
                className={cn(
                  buttonClass,
                  item === page
                    ? 'border-brand bg-brand font-bold text-white'
                    : 'border-line text-ink hover:border-ink',
                )}
              >
                {item}
              </Link>
            </li>
          ),
        )}
        <li>{arrow(next, t('next'), <ChevronRight className="size-5" aria-hidden />)}</li>
      </ol>
      {backToTop ? (
        <a
          href="#main"
          className="hidden items-center gap-1 text-small font-medium text-brand-dark no-underline hover:underline lg:inline-flex"
        >
          {t('backToTop')}
          <ArrowUp className="size-4" aria-hidden />
        </a>
      ) : (
        <span className="hidden lg:block" />
      )}
    </nav>
  );
}
