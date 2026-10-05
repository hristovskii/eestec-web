import { ArrowRight, CalendarPlus } from 'lucide-react';

import { Link } from '@/shared/i18n/navigation';
import { Chip, StatusBadge } from '@/shared/ui/chip';
import { Countdown } from '@/shared/ui/countdown';
import { Button } from '@/shared/ui/primitives/button';
import { SectionTitle } from '@/shared/ui/section-title';

import { DsLabel, DsSection } from './ds-section';

const SAMPLE_NOW = '2026-10-04T18:18:00+02:00';

export function ButtonsSection() {
  return (
    <DsSection
      id="buttons"
      title="Buttons & links"
      intro="Height 48 (40 small, 52 form submit) · radius 8 · Medium 16. One primary action per section. Hover and keyboard focus are live: hover or Tab through them. Admin pages render every size at 36px (data-density)."
      frames="01-Main"
    >
      <div className="grid items-center gap-x-6 gap-y-5 md:grid-cols-[160px_repeat(3,minmax(0,1fr))]">
        <span />
        <DsLabel>Default</DsLabel>
        <DsLabel>Small</DsLabel>
        <DsLabel>Disabled</DsLabel>
        <strong className="text-small">Primary</strong>
        <div>
          <Button asChild>
            <Link href="/join">Join Us</Link>
          </Button>
        </div>
        <div>
          <Button asChild size="sm">
            <Link href="/upcoming">
              Apply now
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
        <div>
          <Button disabled>Applications closed</Button>
        </div>
        <strong className="text-small">Secondary</strong>
        <div>
          <Button asChild variant="secondary">
            <Link href="/upcoming">Upcoming Events</Link>
          </Button>
        </div>
        <div>
          <Button variant="secondary" size="sm">
            <CalendarPlus aria-hidden />
            Add to calendar
          </Button>
        </div>
        <div>
          <Button variant="secondary" disabled>
            Upcoming Events
          </Button>
        </div>
        <strong className="text-small">Quiet · XL</strong>
        <div>
          <Button variant="quiet">Clear filters</Button>
        </div>
        <div>
          <Button size="xl">Submit application</Button>
        </div>
        <div className="flex flex-wrap gap-6">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 font-medium text-brand-dark no-underline hover:text-brand hover:underline"
          >
            View all events
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <a
            href="https://eestec.net"
            className="font-medium text-brand-dark no-underline hover:text-brand hover:underline"
          >
            eestec.net ↗
          </a>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-6 rounded-md bg-brand p-8">
        <span className="w-34 text-small font-medium text-white">On red surfaces (hero, CTA bands)</span>
        <Button asChild variant="inverse">
          <Link href="/join">Join Us</Link>
        </Button>
        <Button asChild variant="outlineWhite">
          <Link href="/upcoming">Upcoming Events</Link>
        </Button>
      </div>
    </DsSection>
  );
}

export function BadgesAndTitleSection() {
  return (
    <section
      className="grid gap-12 border-t border-line py-18 lg:grid-cols-2"
      aria-label="Badges, chips and section title"
    >
      <DsSection
        id="badges"
        title="Badges & chips"
        className="border-t-0 py-0"
        frames="01-Main, 01-EventCard"
      >
        <div className="flex flex-col gap-4">
          <DsLabel>Application status</DsLabel>
          <div className="flex flex-wrap gap-2.5">
            <StatusBadge tone="open">Applications open</StatusBadge>
            <StatusBadge tone="open">Closing soon</StatusBadge>
            <StatusBadge tone="soon">Opening soon</StatusBadge>
            <StatusBadge tone="closed">Applications closed</StatusBadge>
            <StatusBadge tone="dark">Full · waitlist open</StatusBadge>
            <StatusBadge tone="dark">Just ended</StatusBadge>
          </div>
          <DsLabel>Event type and scope</DsLabel>
          <div className="flex flex-wrap gap-2.5">
            <Chip>Workshop</Chip>
            <Chip>Exchange</Chip>
            <Chip>Training</Chip>
            <Chip tone="outline">Local</Chip>
            <Chip tone="outline">International</Chip>
            <Chip tone="red">Members only</Chip>
            <Chip tone="dark">Board</Chip>
          </div>
          <DsLabel>Countdown (live, mock clock pinned to 4 Oct 2026 18:18)</DsLabel>
          <Countdown target="2026-11-07T10:00:00+01:00" now={SAMPLE_NOW} label="Event starts in" />
          <Countdown
            target="2026-10-18T23:59:00+02:00"
            now={SAMPLE_NOW}
            variant="timer"
            label="Applications close in"
          />
          <Countdown
            target="2026-10-06T23:59:00+02:00"
            now={SAMPLE_NOW}
            variant="timer"
            urgent
            label="Last chance! Applications close in"
          />
        </div>
      </DsSection>
      <DsSection id="section-title" title="Section title" className="border-t-0 py-0" frames="01-Main">
        <div className="rounded-md border border-dashed border-line-strong p-8">
          <SectionTitle
            eyebrow="Optional eyebrow"
            title="What is EESTEC?"
            intro="Optional intro, max 640px wide. Centered variant used for Partners and Journey."
          />
        </div>
        <div className="rounded-md border border-dashed border-line-strong p-8">
          <SectionTitle align="center" title="Our Partners" intro="Centered variant." />
        </div>
        <p className="text-small text-muted-ink">
          {'<SectionTitle eyebrow? title intro? align="left|center" />'} · underline 56 × 4, radius 2, #e52a30
        </p>
      </DsSection>
    </section>
  );
}
