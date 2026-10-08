import { CommitteeNetwork } from '@/features/committees';
import { getCommittees } from '@/features/committees/server';

import { currentLocale } from '@/shared/i18n/current-locale';

import { DsSection } from './ds-section';

// The real component with the sample committees (features/committees/data/fixtures).
export async function CommitteesSection() {
  const committees = await getCommittees(await currentLocale());
  return (
    <DsSection
      id="committee-map"
      title="Committee map"
      intro="Leaflet with OpenStreetMap tiles (src/shared/config/map.ts), pins drawn as divs. Filters, the Map / List switch and the popup; below 720 px the popup becomes a card under the map. Every pin is a button: Tab, Enter, Escape."
      frames="01-CommitteeMap, 02-Home-Desktop, 02-Home-Mobile"
    >
      <CommitteeNetwork committees={committees} />
    </DsSection>
  );
}
