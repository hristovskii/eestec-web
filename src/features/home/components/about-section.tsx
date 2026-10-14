import { ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Section } from '@/shared/ui/container';
import { IconCard } from '@/shared/ui/cards';
import { SectionTitle } from '@/shared/ui/section-title';

import type { PublicHome } from '../types';
import { ActivityIconView } from './activity-icon';

export const EESTEC_URL = 'https://eestec.net';

/** "What is EESTEC?" (Home › About): the text, the link to eestec.net and the activity cards. */
export function AboutSection({ about }: { about: PublicHome['about'] }) {
  const t = useTranslations('home.about');
  const [lead, ...rest] = about.paragraphs;
  return (
    <Section aria-labelledby="home-about" className="lg:py-24">
      <div className="flex flex-col gap-8 lg:gap-14">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <SectionTitle id="home-about" eyebrow={t('eyebrow')} title={t('title')} />
          <div className="flex flex-col gap-3.5 lg:gap-4">
            {lead && <p className="text-[17px] leading-[1.6] lg:text-[18px]">{lead}</p>}
            {rest.map((paragraph) => (
              <p key={paragraph} className="text-body text-muted-ink">
                {paragraph}
              </p>
            ))}
            <a
              href={EESTEC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 self-start font-medium text-brand-dark no-underline hover:text-brand hover:underline"
            >
              {t('visit')}
              <ExternalLink className="size-4" aria-hidden />
              <span className="sr-only">{t('newTab')}</span>
            </a>
          </div>
        </div>
        {about.activities.length > 0 && (
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-3 lg:gap-6">
            {about.activities.map((activity) => (
              <li key={activity.id} className="flex">
                <IconCard
                  icon={<ActivityIconView icon={activity.icon} />}
                  title={activity.title}
                  className="w-full p-4 lg:p-7 [&_h3]:text-[16px] lg:[&_h3]:text-[20px]"
                >
                  {activity.text}
                </IconCard>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
