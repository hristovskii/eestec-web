import type { Metadata } from 'next';
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
import { getSiteSettings, pageMetadata } from '@/features/settings/server';
import { currentLocale } from '@/shared/i18n/current-locale';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('home', await currentLocale());
}

// Home: the sections in the order and visibility the board sets (Admin › Pages › Home). Each
// feature supplies its own section; a section with nothing to show is left out.
export default async function HomePage() {
  const locale = await currentLocale();
  const [layout, home, committees, settings, upcoming, latest] = await Promise.all([
    getHomeLayout(),
    getHome(locale),
    getCommittees(locale),
    getSiteSettings(locale),
    getUpcomingList(locale),
    getLatestEvents(locale, 3),
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
        // Phase 2 (M17) adds the Memories row here.
      />
    ),
    // The journey teaser arrives with M9, the partner strip (always above the footer) with M11.
    journey: null,
  };

  return (
    <>
      <HomeHero hero={home.hero}>
        {next && <HomeNextEvent item={next} now={upcoming.now} locale={locale} />}
      </HomeHero>
      {layout.map((key) => (
        <React.Fragment key={key}>{sections[key]}</React.Fragment>
      ))}
    </>
  );
}
