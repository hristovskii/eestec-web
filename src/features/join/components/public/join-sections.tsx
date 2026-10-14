import { ArrowDownToLine, FileText } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import * as React from 'react';

import { formatBytes } from '@/features/media';
import { cn } from '@/shared/lib/cn';
import { Section } from '@/shared/ui/container';
import { Button } from '@/shared/ui/primitives/button';
import { SectionTitle } from '@/shared/ui/section-title';

import type { JoinSection, PublicJoin } from '../../types';
import { JoinIconView } from '../join-icon';

const anchor = 'scroll-mt-32 xl:scroll-mt-36';

/** A red check mark list (JoinPage .checks). */
function Checks({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn('m-0 flex list-none flex-col gap-3 p-0', className)}>
      {items.map((item) => (
        <li key={item} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 text-body leading-[1.5]">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m8 12 3 3 5-6" />
          </svg>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Heading({ section, title, intro }: { section: JoinSection; title: string; intro?: string }) {
  const t = useTranslations('join.eyebrow');
  return (
    <SectionTitle id={`${section}-title`} eyebrow={t(section)} title={title} intro={intro || undefined} />
  );
}

// ─── 1 · Why join ───

export function WhyJoin({ join }: { join: PublicJoin }) {
  if (join.benefits.length === 0) return null;
  return (
    <Section id="why" aria-labelledby="why-title" className={anchor}>
      <div className="flex flex-col gap-8 lg:gap-12">
        <Heading section="why" title={join.headings.why} />
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {join.benefits.map((benefit) => (
            <li key={benefit.id} className="flex flex-col gap-3 rounded-xl border border-line p-6 lg:p-7">
              <span
                aria-hidden
                className="flex size-12 items-center justify-center rounded-xl bg-brand-tint text-brand"
              >
                <JoinIconView icon={benefit.icon} className="size-6" />
              </span>
              <h3 className="text-[20px] font-bold">{benefit.title}</h3>
              <p className="text-[15px] leading-[1.5] text-muted-ink">{benefit.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

// ─── 2 · Who can join ───

export function WhoCanJoin({ join, email }: { join: PublicJoin; email: string }) {
  const { eligibility } = join;
  if (eligibility.items.length === 0 && !eligibility.noteTitle) return null;
  return (
    <Section id="who" tone="grey" aria-labelledby="who-title" className={anchor}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-14">
        <div className="flex flex-col gap-6">
          <Heading section="who" title={join.headings.who} />
          <Checks items={eligibility.items} />
        </div>
        {eligibility.noteTitle && (
          <div className="flex flex-col gap-3.5 rounded-2xl bg-white p-6 lg:p-8">
            <h3 className="text-[20px] font-bold">{eligibility.noteTitle}</h3>
            {eligibility.noteText && <p className="text-body text-muted-ink">{eligibility.noteText}</p>}
            {email && (
              <a href={`mailto:${email}`} className="font-medium text-brand-dark hover:text-brand">
                {email}
              </a>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── 3 · How to join ───

export function HowToJoin({ join, hasForm }: { join: PublicJoin; hasForm: boolean }) {
  const t = useTranslations('join.how');
  if (join.steps.length === 0 && !join.fee) return null;
  const { fee } = join;
  return (
    <Section id="how" aria-labelledby="how-title" className={anchor}>
      <div className="flex flex-col gap-8 lg:gap-12">
        <Heading section="how" title={join.headings.how} />
        {join.steps.length > 0 && (
          <div className="relative">
            <span
              aria-hidden
              className="absolute top-[31px] hidden h-1 rounded-[2px] bg-brand lg:block"
              style={{ left: `${50 / join.steps.length}%`, right: `${50 / join.steps.length}%` }}
            />
            <ol
              className="relative m-0 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-[repeat(var(--steps),minmax(0,1fr))] lg:gap-6"
              style={{ '--steps': join.steps.length } as React.CSSProperties}
            >
              {join.steps.map((step, index) => (
                <li
                  key={step.id}
                  className="flex items-start gap-4 lg:flex-col lg:items-center lg:gap-3 lg:text-center"
                >
                  <span
                    aria-hidden
                    className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-[22px] font-bold text-white shadow-[0_0_0_8px_white] lg:size-16.5 lg:text-[26px]"
                  >
                    {index + 1}
                  </span>
                  <div className="flex flex-col gap-1 lg:items-center lg:gap-3 lg:pt-1.5">
                    <h3 className="text-[19px] leading-[1.3] font-bold">{step.title}</h3>
                    <p className="text-[15px] leading-[1.5] text-muted-ink lg:max-w-60">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
        {fee && (
          <div className="grid gap-4 rounded-2xl border border-brand/30 bg-brand-tint p-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-7 lg:px-8 lg:py-7">
            <div className="flex flex-col">
              <span className="text-small font-medium text-muted-ink">{t('fee')}</span>
              <strong className="text-[28px] leading-[1.2] lg:text-[32px]">
                {fee.amount}{' '}
                {fee.per && <span className="text-[16px] font-medium text-muted-ink">{fee.per}</span>}
              </strong>
            </div>
            {fee.note && <p className="text-body">{fee.note}</p>}
            {hasForm && (
              <Button asChild className="max-lg:w-full">
                <a href="#apply">{t('start')}</a>
              </Button>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── 4 · Rules & code of conduct ───

function RuleList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-4.5 rounded-2xl bg-white p-6 lg:p-7">
      <h3 className="text-[22px] font-bold">{title}</h3>
      <Checks items={items} />
    </div>
  );
}

export function RulesSection({ join }: { join: PublicJoin }) {
  const t = useTranslations('join.rules');
  const format = useFormatter();
  const { rules } = join;
  const phases = [
    { key: 'before', items: rules.international.before },
    { key: 'during', items: rules.international.during },
    { key: 'after', items: rules.international.after },
  ].filter((phase) => phase.items.length > 0);
  const hasRules =
    rules.rights.length > 0 || rules.duties.length > 0 || rules.conduct.length > 0 || phases.length > 0;
  if (!hasRules && join.documents.length === 0) return null;
  return (
    <Section id="rules" tone="grey" aria-labelledby="rules-title" className={anchor}>
      <div className="flex flex-col gap-8 lg:gap-10">
        <Heading section="rules" title={join.headings.rules} intro={rules.intro} />

        {(rules.rights.length > 0 || rules.duties.length > 0) && (
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            <RuleList title={t('rights')} items={rules.rights} />
            <RuleList title={t('duties')} items={rules.duties} />
          </div>
        )}

        {rules.conduct.length > 0 && (
          <div className="flex flex-col gap-4.5">
            <h3 className="text-[22px] font-bold">{t('conduct')}</h3>
            <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
              {rules.conduct.map((card) => (
                <li key={card.id} className="flex flex-col gap-2.5 rounded-xl bg-white p-6">
                  <span
                    aria-hidden
                    className="flex size-11 items-center justify-center rounded-xl bg-brand-tint text-brand"
                  >
                    <JoinIconView icon={card.icon} className="size-5.5" />
                  </span>
                  <strong className="text-[17px]">{card.title}</strong>
                  <p className="text-small text-muted-ink">{card.text}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {phases.length > 0 && (
          <div className="flex flex-col gap-4.5">
            <h3 className="text-[22px] font-bold">{t('international')}</h3>
            <ul className="m-0 grid list-none gap-4 p-0 lg:grid-cols-3">
              {phases.map((phase) => (
                <li
                  key={phase.key}
                  className="flex flex-col gap-3 rounded-xl border-t-4 border-brand bg-white p-6"
                >
                  <span className="text-[13px] font-bold tracking-[0.08em] text-brand-dark uppercase">
                    {t(`phases.${phase.key as 'before'}`)}
                  </span>
                  <ul className="m-0 flex list-disc flex-col gap-2 pl-4.5 text-[15px] leading-[1.5] marker:text-brand">
                    {phase.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        )}

        {join.documents.length > 0 && (
          <div className="flex flex-col gap-4.5">
            <h3 className="text-[22px] font-bold">{t('documents')}</h3>
            <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {join.documents.map((document) => {
                const meta = `PDF · ${formatBytes(document.size)} · ${t('updated', {
                  date: format.dateTime(new Date(document.updatedAt), {
                    month: 'short',
                    year: 'numeric',
                    timeZone: 'Europe/Skopje',
                  }),
                })}`;
                const body = (
                  <>
                    <span
                      aria-hidden
                      className="flex h-13 w-11 shrink-0 items-end justify-center rounded-md bg-brand pb-2 text-[12px] font-bold text-white"
                    >
                      PDF
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <strong className="text-[16px]">{document.title}</strong>
                      <span className="text-small text-muted-ink">
                        {document.file ? meta : `${meta} · ${t('sample')}`}
                      </span>
                    </span>
                    {document.file ? (
                      <ArrowDownToLine className="size-5 shrink-0 text-brand-dark" aria-hidden />
                    ) : (
                      <FileText className="size-5 shrink-0 text-muted-ink" aria-hidden />
                    )}
                  </>
                );
                const box =
                  'flex items-center gap-3.5 rounded-xl border border-line bg-white p-3.5 text-ink no-underline';
                return (
                  <li key={document.id} className="flex">
                    {document.file ? (
                      <a
                        href={document.file.src}
                        download
                        className={cn(
                          box,
                          'w-full hover:border-line-strong hover:shadow-[0_4px_16px_rgb(0_0_0/0.08)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand',
                        )}
                      >
                        {body}
                        <span className="sr-only"> — {t('download')}</span>
                      </a>
                    ) : (
                      <div className={cn(box, 'w-full')}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Section>
  );
}
