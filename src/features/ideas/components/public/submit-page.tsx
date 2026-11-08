import { Lightbulb, MessageSquareText } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';
import { PageHeader } from '@/shared/layout/site/page-header';
import { ActionLink } from '@/shared/ui/action-link';

import type { SubmitTab } from './submit-form';

/** Grey top of /submit (SubmitPage): breadcrumb, "Have an idea? Been to an event?" and the lead. */
export function SubmitHero() {
  const t = useTranslations('ideas.page');
  const tNav = useTranslations('nav');
  return (
    <PageHeader
      title={t('title')}
      breadcrumbs={[{ label: tNav('home'), href: '/' }, { label: t('crumb') }]}
      lead={
        <>
          <span className="max-lg:hidden">{t('lead')}</span>
          <span className="lg:hidden">{t('leadShort')}</span>
        </>
      }
    />
  );
}

const TAB_HREF = { idea: '/submit', impression: '/submit?tab=impression' } as const;

/**
 * The two tabs as links (`?tab=idea|impression`): they work without scripts and keep the chosen
 * event in the address. Desktop: two cards; phones: two short tabs and the note of the tab.
 */
export function SubmitTabs({ tab, event }: { tab: SubmitTab; event: string | null }) {
  const t = useTranslations('ideas.page');
  const hrefFor = (value: SubmitTab) =>
    value === 'impression' && event ? `/submit?tab=impression&event=${event}` : TAB_HREF[value];
  const icons = { idea: Lightbulb, impression: MessageSquareText } as const;
  return (
    <div className="flex flex-col gap-3">
      <nav aria-label={t('tabsLabel')}>
        <ul className="grid grid-cols-2 gap-3">
          {(['idea', 'impression'] as const).map((value) => {
            const Icon = icons[value];
            const current = tab === value;
            return (
              <li key={value} className="flex">
                <Link
                  href={hrefFor(value)}
                  scroll={false}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3.5 rounded-lg border-2 px-4 py-3 no-underline lg:px-5 lg:py-4',
                    'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand',
                    current ? 'border-brand bg-brand-tint' : 'border-line bg-white hover:border-line-strong',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-full max-sm:hidden',
                      current ? 'bg-brand text-white' : 'bg-surface text-ink-2',
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <strong className="text-[15px] leading-tight font-bold text-ink lg:text-[17px]">
                      <span className="max-lg:hidden">{t(`tabs.${value}.title`)}</span>
                      <span className="lg:hidden">{t(`tabs.${value}.short`)}</span>
                    </strong>
                    <span className="text-small text-muted-ink max-lg:hidden">{t(`tabs.${value}.sub`)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="text-small text-muted-ink lg:hidden">{t(`note.${tab}`)}</p>
    </div>
  );
}

export type BecameEvent = { id: string; title: string; slug: string };

/** The cards beside the form (desktop): what happens to ideas, or who sees feedback. */
export function SubmitAside({ tab, became }: { tab: SubmitTab; became: BecameEvent[] }) {
  const t = useTranslations('ideas.page.aside');
  const card = 'flex flex-col gap-3 rounded-lg border border-line bg-white p-5';
  return (
    <aside className="flex flex-col gap-5 max-lg:hidden">
      {tab === 'idea' ? (
        <>
          <section aria-labelledby="sf-aside-reads" className={card}>
            <h2 id="sf-aside-reads" className="text-[18px] font-bold">
              {t('readsTitle')}
            </h2>
            <p className="text-small text-ink-2">{t('readsText')}</p>
          </section>
          {became.length > 0 && (
            <section aria-labelledby="sf-aside-became" className={card}>
              <h2 id="sf-aside-became" className="text-[18px] font-bold">
                {t('becameTitle')}
              </h2>
              <ul className="flex flex-col gap-3">
                {became.map((event) => (
                  <li key={event.id} className="flex flex-col">
                    <ActionLink
                      href={`/events/${event.slug}`}
                      className="font-medium text-brand-dark hover:underline"
                    >
                      {event.title} →
                    </ActionLink>
                    <span className="text-small text-muted-ink">{t('becameText')}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="sf-aside-organize" className={cn(card, 'bg-surface')}>
            <h2 id="sf-aside-organize" className="text-[18px] font-bold">
              {t('organizeTitle')}
            </h2>
            <p className="text-small text-ink-2">{t('organizeText')}</p>
            <ActionLink href="/join" className="font-medium text-brand-dark hover:underline">
              {t('organizeLink')} →
            </ActionLink>
          </section>
        </>
      ) : (
        <>
          <section aria-labelledby="sf-aside-who" className={card}>
            <h2 id="sf-aside-who" className="text-[18px] font-bold">
              {t('whoTitle')}
            </h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-small text-ink-2">
              <li>{t('who1')}</li>
              <li>{t('who2')}</li>
              <li>{t('who3')}</li>
            </ul>
          </section>
          <section aria-labelledby="sf-aside-story" className={cn(card, 'bg-surface')}>
            <h2 id="sf-aside-story" className="text-[18px] font-bold">
              {t('storyTitle')}
            </h2>
            <p className="text-small text-ink-2">{t('storyText')}</p>
            <ActionLink href="/memories/new" className="font-medium text-brand-dark hover:underline">
              {t('storyLink')} →
            </ActionLink>
          </section>
        </>
      )}
    </aside>
  );
}
