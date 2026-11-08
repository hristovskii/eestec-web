import { MemberCard } from '@/features/members/public';

import { DsSection } from './ds-section';

const stefan = {
  username: 'stefan-nikolovski',
  name: 'Stefan Nikolovski',
  initials: 'SN',
  photo: { src: null },
  teams: ['PR'],
  role: 'lead' as const,
  since: 2023,
  membersOnly: false,
};

export function MemberCardsSection() {
  return (
    <DsSection
      id="member-cards"
      title="Members and board"
      intro="One card for every place a person appears (Phase 2): member (grid, 220 px, and the compact phone version), hover, no photo, members only (only logged-in members ever see it), board with position e-mail, a past board without e-mail, the phone board row and the two alumni cards."
      frames="01-MemberCard, 07-MemberCardStates"
    >
      <div className="flex flex-col gap-10">
        <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          <li>
            <MemberCard variant="member" member={stefan} headingLevel="h3" />
          </li>
          <li>
            <MemberCard variant="member" member={stefan} hover />
          </li>
          <li>
            <MemberCard
              variant="member"
              member={{
                ...stefan,
                username: 'ivana-mitrevska',
                name: 'Ivana Mitrevska',
                initials: 'IM',
                photo: null,
                teams: ['IT'],
                role: 'new',
                since: 2026,
              }}
            />
          </li>
          <li>
            <MemberCard
              variant="member"
              member={{
                ...stefan,
                username: 'marija-stojanovska',
                name: 'Marija Stojanovska',
                initials: 'MS',
                teams: ['Events'],
                membersOnly: true,
              }}
            />
          </li>
          <li>
            <div className="max-w-[171px]">
              <MemberCard variant="member" member={{ ...stefan, teams: ['PR', 'Design'] }} compact />
            </div>
          </li>
        </ul>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <li>
            <MemberCard
              variant="board"
              member={{
                name: 'Ana Trajkovska',
                initials: 'AT',
                username: 'ana-trajkovska',
                position: 'Chairperson',
                email: 'chair@eestec.mk',
                photo: { src: null },
              }}
            />
          </li>
          <li>
            <MemberCard
              variant="board"
              member={{
                name: 'Bojan Petreski',
                initials: 'BP',
                username: 'bojan-petreski',
                position: 'Chairperson',
                email: null,
                photo: { src: null },
              }}
            />
          </li>
          <li className="flex flex-col gap-4">
            <MemberCard
              variant="board-row"
              member={{
                name: 'Ivana Kostova',
                initials: 'IK',
                username: 'ivana-kostova',
                position: 'Vice Chair · External',
                email: 'partners@eestec.mk',
                photo: { src: null },
              }}
            />
          </li>
          <li className="flex flex-col gap-4">
            <MemberCard
              variant="alumni"
              member={{
                username: 'bojan-petreski',
                name: 'Bojan Petreski',
                initials: 'BP',
                years: '2018–2023',
                highlight: 'Chair 2021/22',
                now: 'Embedded engineer at Gridnova',
              }}
            />
            <MemberCard
              variant="alumni"
              member={{
                username: 'ljupcho-georgiev',
                name: 'Ljupcho Georgiev',
                initials: 'LG',
                years: '2014–2018',
                highlight: '',
                now: '',
              }}
            />
          </li>
        </ul>
      </div>
    </DsSection>
  );
}
