import type { CountryCode } from '@/shared/i18n/country';
import type { Localized } from '@/shared/types/localized';

/** Local Committee, Observer, or Junior Local Committee (the pin styles of CommitteeMap). */
export const COMMITTEE_STATUSES = ['lc', 'observer', 'jlc'] as const;
export type CommitteeStatus = (typeof COMMITTEE_STATUSES)[number];

/**
 * One EESTEC committee on the map (D15: kept by hand in Admin › Map / Committees, no eestec.net
 * sync). Countries are ISO codes, named in the language of the page. The city is board content in
 * both languages (D8: "Скопје" / "Skopje"; an empty English one shows the Macedonian one).
 */
export type Committee = {
  id: string;
  /** "LC Belgrade", "Observer Podgorica", "JLC Sofia". */
  name: string;
  status: CommitteeStatus;
  city: Localized;
  country: CountryCode;
  lat: number;
  lng: number;
  /** Website or social page; '' when there is none. */
  url: string;
  /** Our own committee: the red, highlighted pin. Exactly one. */
  isHome: boolean;
};

export type CommitteeInput = Omit<Committee, 'id'>;

/**
 * A committee as the public pages show it: the country is already named in the language of the
 * page. That is done on the server, because not every browser has the Macedonian country names
 * (Intl.DisplayNames) but Node always does.
 */
export type PublicCommittee = Omit<Committee, 'city'> & { city: string; countryName: string };

export type CommitteeCounts = Record<CommitteeStatus | 'all', number>;

export type CommitteeSort = 'name' | '-name' | 'country' | '-country' | 'status';
