import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as React from 'react';

import { HomeNextEvent } from '@/features/applications';
import { getUpcomingList } from '@/features/applications/server';
import { CommitteesSection } from '@/features/committees';
import { getCommittees } from '@/features/committees/server';
import { EventCard } from '@/features/events';
import { getLatestEvents } from '@/features/events/server';
import {
  AboutSection,
  HomeHero,
  type HomeSectionKey,
  LatestSection,
  MeetingSection,
  NumbersSection,
  TraditionSection,
} from '@/features/home';
import { getHome, getHomeLayout } from '@/features/home/server';
import { JourneyTeaser } from '@/features/journey';
import { getJourney } from '@/features/journey/server';
import { MemoriesRow } from '@/features/memories/public';
import { getLatestMemories } from '@/features/memories/server';
import type { MemoryCardModel } from '@/features/memories';
import { getAuthorCards } from '@/features/members/server';
import { PartnerStrip } from '@/features/partners';
import { getPartners } from '@/features/partners/server';
import { getSiteSettings, organizationJsonLd, pageMetadata } from '@/features/settings/server';
import { isEnabled } from '@/shared/config/flags';
import { SITE_URL } from '@/shared/config/site';
import type { Locale } from '@/shared/i18n/routing';
import { currentLocale } from '@/shared/i18n/current-locale';
import { JsonLdScript } from '@/shared/seo/json-ld-script';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('home', await currentLocale());
}

// The Memories row (Phase 2): the cards are cached; their authors depend on the members feature, so
// they stream in behind the page.
async function HomeMemories({ cards, locale }: { cards: MemoryCardModel[]; locale: Locale }) {
  const [t, authors] = await Promise.all([
    getTranslations('memories.home'),
    getAuthorCards(
      'visitor',
      locale,
      cards.flatMap((card) => (card.authorId ? [card.authorId] : [])),
    ),
  ]);
  return (
    <MemoriesRow
      id="home-memories"
      title={t('title')}
      cards={cards}
      authors={authors}
      locale={locale}
      swipe
      link={{ href: '/memories', label: t('link'), shortLabel: t('linkShort') }}
    />
  );
}

// Home: the sections in the order and visibility the board sets (Admin › Pages › Home). Each
// feature supplies its own section; a section with nothing to show is left out.
export default async function HomePage() {
  const locale = await currentLocale();
  const [layout, home, committees, settings, upcoming, latest, journey, partners, memories] =
    await Promise.all([
      getHomeLayout(),
      getHome(locale),
      getCommittees(locale),
      getSiteSettings(locale),
      getUpcomingList(locale),
      getLatestEvents(locale, 3),
      getJourney(locale),
      getPartners(locale),
      isEnabled('phase2') ? getLatestMemories(locale, 3) : Promise.resolve([]),
    ]);

  const next = upcoming.items.find((item) => item.nextUp) ?? upcoming.items[0];
  const { weeklyMeeting } = settings;

  const sections: Record<HomeSectionKey, React.ReactNode> = {
    about:
      home.about.paragraphs.length > 0 || home.about.activities.length > 0 ? (
        <AboutSection about={home.about} />
      ) : null,
    tradition: home.tradition.length > 0 ? <TraditionSection milestones={home.tradition} /> : null,
    numbers: home.stats.length > 0 ? <NumbersSection stats={home.stats} /> : null,
    map: <CommitteesSection committees={committees} />,
    meeting: weeklyMeeting.showOnHome ? (
      <MeetingSection meeting={weeklyMeeting} address={settings.contact.address || null} />
    ) : null,
    latest: (
      <LatestSection
        events={latest.map((event) => (
          <EventCard key={event.id} event={event} locale={locale} headingLevel="h3" />
        ))}
        memories={
          memories.length > 0 ? (
            <React.Suspense fallback={null}>
              <HomeMemories cards={memories} locale={locale} />
            </React.Suspense>
          ) : undefined
        }
      />
    ),
    journey: <JourneyTeaser steps={journey.steps} />,
  };

  return (
    <>
      <JsonLdScript data={organizationJsonLd(settings, SITE_URL.origin)} />
      <HomeHero hero={home.hero}>
        {next && <HomeNextEvent item={next} now={upcoming.now} locale={locale} />}
      </HomeHero>
      {layout.map((key) => (
        <React.Fragment key={key}>{sections[key]}</React.Fragment>
      ))}
      {/* Always the last section, directly above the footer (spec 01). */}
      <PartnerStrip tiers={partners.tiers} />
    </>
  );
}
