import { useTranslations } from 'next-intl';

import { PageHeader } from '@/shared/layout/site/page-header';
import { ActionLink } from '@/shared/ui/action-link';

import type { PublicContact } from '../../types';

/** Grey top: breadcrumb, title, lead and the two shortcut cards ("Want to join? Join Us →"). */
export function ContactHero({ page }: { page: PublicContact }) {
  const tNav = useTranslations('nav');
  return (
    <PageHeader
      title={page.hero.title}
      breadcrumbs={[{ label: tNav('home'), href: '/' }, { label: page.hero.title }]}
      lead={page.hero.lead}
      actions={
        page.shortcuts.length > 0 ? (
          <div className="grid w-full grid-cols-2 gap-2.5 lg:flex lg:w-auto lg:gap-3">
            {page.shortcuts.map((card) => (
              <ActionLink
                key={card.id}
                href={card.href}
                className="flex flex-col gap-0.5 rounded-lg border border-line bg-white px-3.5 py-3 text-ink no-underline hover:border-brand lg:min-w-50 lg:px-5 lg:py-4"
              >
                <span className="text-small text-muted-ink">{card.eyebrow}</span>
                <strong className="text-[15px] font-bold text-brand-dark lg:text-[16px]">
                  {card.label} →
                </strong>
              </ActionLink>
            ))}
          </div>
        ) : undefined
      }
    />
  );
}
