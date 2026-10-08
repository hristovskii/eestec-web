// SAMPLE DATA — the committees on the canvas map (CommitteeMap, Home-Desktop), 34 pins plus LC
// Skopje = 35 ("All · 35": 23 Local Committees, 8 Observers, 4 JLCs, in 21 countries).
//
// The canvas draws its pins by hand on a picture: it has no coordinates. The coordinates here are
// the real positions of each city (facts, rounded to two decimals), so Leaflet puts the pins where
// they belong. Names follow the canvas pin labels ("LC Belgrade", "Observer Podgorica", "JLC
// Sofia"). The canvas gives no website for any committee except LC Skopje (eestec.mk), so the
// others have none.
//
// Cities are written in Latin (mk = en) until the board supplies the Macedonian spelling (D14).
//
// ⚠ BEFORE LAUNCH the board checks every row against eestec.net (is this committee still active?
// which type? website?) in Admin › Map / Committees, or imports the real list as a CSV. See
// docs/sample-data.md.
import type { CountryCode } from '@/shared/i18n/country';

import type { Committee, CommitteeStatus } from '../../types';

type Row = [city: string, country: CountryCode, status: CommitteeStatus, lat: number, lng: number];

const rows: Row[] = [
  ['Belgrade', 'RS', 'lc', 44.82, 20.46],
  ['Novi Sad', 'RS', 'lc', 45.26, 19.83],
  ['Niš', 'RS', 'lc', 43.32, 21.9],
  ['Zagreb', 'HR', 'lc', 45.81, 15.98],
  ['Ljubljana', 'SI', 'lc', 46.06, 14.51],
  ['Sarajevo', 'BA', 'lc', 43.86, 18.41],
  ['Tuzla', 'BA', 'lc', 44.54, 18.67],
  ['Podgorica', 'ME', 'observer', 42.44, 19.26],
  ['Sofia', 'BG', 'jlc', 42.7, 23.32],
  ['Bucharest', 'RO', 'lc', 44.43, 26.1],
  ['Cluj-Napoca', 'RO', 'observer', 46.77, 23.59],
  ['Budapest', 'HU', 'lc', 47.5, 19.04],
  ['Athens', 'GR', 'lc', 37.98, 23.73],
  ['Patras', 'GR', 'lc', 38.25, 21.73],
  ['Thessaloniki', 'GR', 'observer', 40.64, 22.94],
  ['Istanbul', 'TR', 'lc', 41.01, 28.98],
  ['Ankara', 'TR', 'observer', 39.93, 32.86],
  ['Delft', 'NL', 'lc', 52.01, 4.36],
  ['Eindhoven', 'NL', 'lc', 51.44, 5.48],
  ['Aachen', 'DE', 'lc', 50.78, 6.08],
  ['Karlsruhe', 'DE', 'jlc', 49.01, 8.4],
  ['Munich', 'DE', 'lc', 48.14, 11.58],
  ['Zurich', 'CH', 'lc', 47.38, 8.54],
  ['Lausanne', 'CH', 'observer', 46.52, 6.63],
  ['Milan', 'IT', 'jlc', 45.46, 9.19],
  ['Madrid', 'ES', 'observer', 40.42, -3.7],
  ['Lisbon', 'PT', 'lc', 38.72, -9.14],
  ['Kraków', 'PL', 'lc', 50.06, 19.94],
  ['Gliwice', 'PL', 'lc', 50.29, 18.67],
  ['Warsaw', 'PL', 'observer', 52.23, 21.01],
  ['Riga', 'LV', 'lc', 56.95, 24.11],
  ['Tallinn', 'EE', 'jlc', 59.44, 24.75],
  ['Kyiv', 'UA', 'lc', 50.45, 30.52],
  ['Kharkiv', 'UA', 'observer', 49.99, 36.23],
];

const PREFIX: Record<CommitteeStatus, string> = { lc: 'LC', observer: 'Observer', jlc: 'JLC' };

const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const committeesFixture: Committee[] = [
  {
    id: 'cm-skopje',
    name: 'LC Skopje',
    status: 'lc',
    city: { mk: 'Skopje', en: 'Skopje' },
    country: 'MK',
    lat: 41.99,
    lng: 21.43,
    url: 'https://eestec.mk',
    isHome: true,
  },
  ...rows.map(([city, country, status, lat, lng]): Committee => ({
    id: `cm-${slug(city)}`,
    name: `${PREFIX[status]} ${city}`,
    status,
    city: { mk: city, en: city },
    country,
    lat,
    lng,
    url: '',
    isHome: false,
  })),
];
