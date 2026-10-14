'use client';

import { useTranslations } from 'next-intl';

import { Section } from '@/shared/ui/container';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/ui/primitives/accordion';
import { SectionTitle } from '@/shared/ui/section-title';

import type { PublicJoin } from '../../types';

/** "Questions we hear a lot" (JoinPage › FAQ): one answer open at a time; the heading stays while you read. */
export function JoinFaq({ join, email }: { join: PublicJoin; email: string }) {
  const t = useTranslations('join.faq');
  const tEyebrow = useTranslations('join.eyebrow');
  if (join.faq.length === 0) return null;
  return (
    <Section id="faq" aria-labelledby="faq-title" className="scroll-mt-32 xl:scroll-mt-36">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-start lg:gap-14">
        <div className="flex flex-col gap-3 lg:sticky lg:top-44">
          <SectionTitle id="faq-title" eyebrow={tEyebrow('faq')} title={join.headings.faq} />
          {email && (
            <p className="pt-2 text-body text-muted-ink">
              {t.rich('write', {
                link: () => (
                  <a href={`mailto:${email}`} className="font-medium text-brand-dark hover:text-brand">
                    {email}
                  </a>
                ),
              })}
            </p>
          )}
        </div>
        <Accordion type="single" collapsible className="border-t border-line">
          {join.faq.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent className="max-w-[640px]">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}
