import { Calendar, CalendarX2, Cpu, MapPin } from 'lucide-react';

import { Link } from '@/shared/i18n/navigation';
import { BrandLogo } from '@/shared/ui/brand-logo';
import { IconCard, InitialsAvatar, StatTile } from '@/shared/ui/cards';
import { Chip, StatusBadge } from '@/shared/ui/chip';
import { EmptyState } from '@/shared/ui/empty-state';
import { MediaCard, MediaCardMeta, MediaCardSkeleton } from '@/shared/ui/media-card';
import { Button } from '@/shared/ui/primitives/button';

import { DsLabel, DsSection } from './ds-section';

// SAMPLE DATA from handoff/design-source/Main.dc.html (cardUpcoming, cardMemory, cardLong).
const organized = (
  <span className="inline-flex h-[30px] items-center gap-2 rounded-full bg-white pr-3 pl-1 text-[13px] font-medium text-ink shadow-badge">
    <BrandLogo variant="icon" height={22} alt="" className="rounded-full" />
    Organized by LC Skopje
  </span>
);

export function CardsSection() {
  return (
    <DsSection
      id="cards"
      title="Cards"
      intro="One card for events, upcoming events and memories: white, radius 12, soft shadow, 16:10 image on top. Titles clamp to 2 lines; a missing image falls back to the white logo on red. EventCard and MemoryCard (features) are built on this shell."
      frames="01-Main, 01-EventCard"
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <MediaCard
          href="/upcoming/ai-at-the-edge"
          title="Workshop: AI at the Edge"
          cover={{
            sample: true,
            caption: 'participants soldering dev boards in the FEEIT lab',
            alt: 'Participants soldering dev boards in the FEEIT lab',
          }}
          ctaLabel="View event"
          badge={
            <StatusBadge tone="open" overlay>
              Applications open
            </StatusBadge>
          }
          cornerBadge={organized}
          chips={
            <>
              <Chip size="sm">Workshop</Chip>
              <Chip size="sm" tone="outline">
                International
              </Chip>
            </>
          }
        >
          <div className="flex flex-col gap-1.5">
            <MediaCardMeta icon={<Calendar />}>7–13 Nov 2026</MediaCardMeta>
            <MediaCardMeta icon={<MapPin />}>Skopje &amp; Ohrid</MediaCardMeta>
          </div>
        </MediaCard>
        <MediaCard
          href="/memories/ohrid-bus-ride"
          title="Seven days, 28 nationalities and one very long bus ride to Ohrid"
          cover={{
            sample: true,
            caption: 'group selfie on the Ohrid lake shore',
            alt: 'Group selfie on the Ohrid lake shore',
          }}
          ctaLabel="Read the story"
          chips={<Chip size="sm">Memory</Chip>}
        >
          <p className="line-clamp-3 text-[15px] leading-[1.55] text-muted-ink">
            What I expected from my first workshop as an organizer, and what actually happened when 28
            students arrived in Skopje at once.
          </p>
          <div className="flex items-center gap-2.5">
            <InitialsAvatar initials="MS" />
            <span className="flex flex-col text-small leading-[1.3]">
              <span className="font-medium">Marija Stojanovska</span>
              <span className="text-muted-ink">2 Jun 2026</span>
            </span>
          </div>
        </MediaCard>
        <MediaCard
          href="/events/ecm-2026"
          title="EESTEC Chairpersons’ Meeting Autumn 2026 — hosted jointly with the Faculty of Electrical Engineering and Information Technologies"
          cover={null}
          ctaLabel="View event"
          chips={
            <>
              <Chip size="sm">Congress</Chip>
              <Chip size="sm" tone="outline">
                International
              </Chip>
            </>
          }
        >
          <div className="flex flex-col gap-1.5">
            <MediaCardMeta icon={<Calendar />}>24–28 Oct 2026</MediaCardMeta>
            <MediaCardMeta icon={<MapPin />}>Hotel Continental, Skopje</MediaCardMeta>
          </div>
        </MediaCard>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-3">
          <DsLabel>Activity / icon card</DsLabel>
          <IconCard icon={<Cpu />} title="Workshops">
            A week of lectures, labs and city life hosted by a committee.
          </IconCard>
        </div>
        <div className="flex flex-col gap-3">
          <DsLabel>Stat</DsLabel>
          <StatTile value="5,000+" label="EESTEC members in Europe" />
        </div>
        <div className="flex flex-col gap-3">
          <DsLabel>Empty state (0 items)</DsLabel>
          <EmptyState
            variant="compact"
            icon={<CalendarX2 className="size-7" />}
            actions={
              <Button asChild variant="secondary" size="sm">
                <a href="https://instagram.com/eestec_skopje">Follow @eestec_skopje</a>
              </Button>
            }
          >
            No upcoming events right now. Follow us on Instagram so you don&apos;t miss the next one.
          </EmptyState>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <DsLabel>Loading skeleton</DsLabel>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <MediaCardSkeleton />
          <MediaCardSkeleton />
          <MediaCardSkeleton />
        </div>
      </div>
      <p className="text-small text-muted-ink">
        Card links point at routes that arrive in later milestones (they 404 for now). See also{' '}
        <Link href="/design-system#navigation">navigation</Link>.
      </p>
    </DsSection>
  );
}
