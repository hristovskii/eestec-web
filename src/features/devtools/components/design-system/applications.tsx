import { ApplyBox, applicationState, UpcomingList } from '@/features/applications';
import type { EventApplicationSettings } from '@/features/events';

import { DsLabel, DsSection } from './ds-section';

// SAMPLE DATA from handoff/design-source/ApplyBox.dc.html and UpcomingStates.dc.html: the six
// states of the application box, computed by the real rules at the pinned canvas moment.

const NOW = '2026-10-04T18:18:00+02:00';
const settings = { deadlineSoonHours: 72, autoCloseApplications: true };
const calendar = { google: 'https://calendar.google.com/calendar/render', ics: '#' };
const applications = (patch: Partial<EventApplicationSettings>): EventApplicationSettings => ({
  enabled: true,
  via: 'form',
  externalUrl: '',
  opensAt: null,
  deadline: '2026-10-18T23:59:00+02:00',
  resultsOn: '2026-10-25',
  maxParticipants: 24,
  waitlist: true,
  admission: 'selection',
  ...patch,
});
const state = (patch: Partial<EventApplicationSettings>, taken = 0, waitlist = 0) =>
  applicationState(
    { startsAt: '2026-11-07T10:00:00+01:00', applications: applications(patch) },
    new Date(NOW),
    settings,
    { taken, waitlist },
  );

const boxes = [
  { label: 'Open', state: state({}), fee: '€60', organizer: null },
  {
    label: 'Deadline soon (default: under 72 h)',
    state: state({ deadline: '2026-10-06T23:59:00+02:00', resultsOn: null, maxParticipants: 30 }),
    fee: 'Free for FEEIT students',
    organizer: null,
  },
  { label: 'Opening soon', state: state({ opensAt: '2026-10-15T12:00:00+02:00' }), fee: '', organizer: null },
  {
    label: 'Closed',
    state: state({ deadline: '2026-10-01T23:59:00+02:00', resultsOn: '2026-10-08' }),
    fee: '',
    organizer: null,
  },
  { label: 'Full', state: state({ maxParticipants: 20 }, 20, 7), fee: '', organizer: null },
  {
    label: 'Event abroad · external application',
    state: state({
      via: 'external',
      externalUrl: 'https://eestec.net',
      deadline: '2026-10-23T23:59:00+02:00',
    }),
    fee: '',
    organizer: 'LC Kraków',
  },
];

export function ApplicationsSection() {
  return (
    <DsSection
      id="applications"
      title="Application box"
      intro="The countdown and apply button on /upcoming/[slug]. The state is set automatically from the open date, the deadline and the number of places (applications/domain/application-state)."
      frames="01-ApplyBox, 06-UpcomingStates, 05-UpcomingList-Empty"
    >
      <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
        {boxes.map((box, index) => (
          <div key={box.label} className="flex flex-col gap-2.5">
            <DsLabel>{box.label}</DsLabel>
            <ApplyBox
              idPrefix={`ds-box-${index}`}
              state={box.state}
              now={NOW}
              locale="en"
              event={{ organizer: box.organizer, feePrice: box.fee }}
              calendar={calendar}
              instagram="eestec_skopje"
              applyHref="#applications"
            />
          </div>
        ))}
      </div>
      <DsLabel>No upcoming events</DsLabel>
      <UpcomingList
        list={{ items: [], now: NOW }}
        scope="all"
        locale="en"
        phase2
        instagram={{ handle: 'eestec_skopje', url: 'https://instagram.com/eestec_skopje' }}
        meeting={{ day: 'wednesday', time: '18:00', room: 'Room 117, FEEIT' }}
      />
    </DsSection>
  );
}
