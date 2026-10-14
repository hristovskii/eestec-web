import { JoinClosed, JoinForm } from '@/features/join';

import { DsSection } from './ds-section';

// The real components with sample options: the open form (empty) and the closed card.
const option = (value: string, label: string) => ({ value, label });
const apply = {
  open: true,
  nextRound: 'February 2027',
  intro: '',
  faculties: [option('fac-1', 'FEEIT'), option('fac-2', 'FINKI'), option('fac-3', 'Other university')],
  interests: [option('int-1', 'IT'), option('int-2', 'PR'), option('int-3', 'Events')],
  heardFrom: [option('heard-1', 'Instagram'), option('heard-2', 'A friend')],
};

export function JoinStatesSection() {
  return (
    <DsSection
      id="join-states"
      title="Membership form"
      intro="The real JoinForm (its options are samples, so the server refuses what is sent from here: use /join to try a real submission) and the closed card that replaces it when Admin switches applications off."
      frames="01-JoinForm, 11-JoinFormStates"
    >
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="rounded-2xl border border-line bg-white p-5 lg:p-9">
          <JoinForm
            apply={apply}
            siteName="EESTEC LC Skopje"
            meeting={{ sentence: 'Wed 7 Oct, 18:00, Room 117, FEEIT', google: '#', ics: '#' }}
          />
        </div>
        <JoinClosed
          nextRound="February 2027"
          meeting="Wednesdays, 18:00 · Room 117, FEEIT"
          instagram="https://instagram.com/eestec_skopje"
        />
      </div>
    </DsSection>
  );
}
