import { useTranslations } from 'next-intl';

import { ActionLink } from '@/shared/ui/action-link';
import { Container } from '@/shared/ui/container';
import { Button } from '@/shared/ui/primitives/button';

import type { PublicJoin } from '../../types';
import { JoinIconView } from '../join-icon';

/**
 * The red top of /join (JoinPage): line, H1, lead, the two buttons and the "At a glance" card.
 * "Apply now" is only offered while the page has the form (`hasForm`).
 */
export function JoinHero({
  hero,
  glance,
  nextSession,
  hasForm,
}: {
  hero: PublicJoin['hero'];
  glance: PublicJoin['glance'];
  /** "Wed 14 Oct · 18:00 · Room 117, FEEIT": the next weekly meeting, from Settings. */
  nextSession: string | null;
  hasForm: boolean;
}) {
  const t = useTranslations('join.hero');
  const items = [
    ...glance.map((item) => ({ ...item })),
    ...(nextSession
      ? [{ id: 'next-session', icon: 'calendar' as const, label: t('nextSession'), value: nextSession }]
      : []),
  ];
  return (
    <section
      aria-label={hero.title}
      className="bg-brand bg-[radial-gradient(rgb(255_255_255/0.16)_1.5px,transparent_1.6px)] bg-size-[22px_22px] text-white"
    >
      <Container
        className={
          items.length > 0
            ? 'grid gap-8 py-10 pb-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-14 lg:py-20 lg:pb-22'
            : 'py-10 pb-12 lg:py-20 lg:pb-22'
        }
      >
        <div className="flex flex-col items-start gap-4 lg:gap-5.5">
          {hero.eyebrow && (
            <span className="text-small font-bold tracking-[0.1em] uppercase">{hero.eyebrow}</span>
          )}
          <h1 className="text-[34px] leading-[1.15] font-bold lg:text-[56px] lg:leading-[1.1]">
            {hero.title}
          </h1>
          <p className="max-w-140 text-[18px] leading-[1.5] font-medium lg:text-[20px]">{hero.lead}</p>
          <div className="flex w-full flex-col gap-3 pt-1.5 sm:w-auto sm:flex-row sm:gap-3.5">
            {hasForm && (
              <Button asChild variant="inverse">
                <a href="#apply">{t('apply')}</a>
              </Button>
            )}
            <Button asChild variant="outlineWhite">
              <ActionLink href="/journey">{t('journey')}</ActionLink>
            </Button>
          </div>
        </div>
        {items.length > 0 && (
          <div className="flex flex-col gap-1 rounded-2xl bg-white p-5 text-ink shadow-[0_24px_48px_rgb(0_0_0/0.18)] lg:p-7">
            <h2 className="pb-2 eyebrow">{t('glance')}</h2>
            <ul className="m-0 flex list-none flex-col p-0">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3.5 border-t border-divider py-3"
                >
                  <span
                    aria-hidden
                    className="flex size-10 items-center justify-center rounded-[10px] bg-brand-tint text-brand"
                  >
                    <JoinIconView icon={item.icon} className="size-5" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-small text-muted-ink">{item.label}</span>
                    <strong className="text-body font-medium">{item.value}</strong>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Container>
    </section>
  );
}
