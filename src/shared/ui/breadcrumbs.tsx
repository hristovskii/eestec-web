import { useTranslations } from 'next-intl';

import { Link } from '@/shared/i18n/navigation';

export type Crumb = { label: string; href?: string };

/** "Home / Events / …" (list and detail pages). The last crumb is the current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useTranslations('ui');
  return (
    <nav aria-label={t('breadcrumb')}>
      <ol className="flex flex-wrap items-center gap-2 text-small text-muted-ink">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {last || !item.href ? (
                <span aria-current={last ? 'page' : undefined} className={last ? 'text-ink' : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-muted-ink no-underline hover:text-brand-dark hover:underline"
                >
                  {item.label}
                </Link>
              )}
              {!last && <span aria-hidden>/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
