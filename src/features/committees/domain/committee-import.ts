import { countryFromText } from '@/shared/i18n/country';
import { type ParsedCsv } from '@/shared/lib/csv-parse';

import { COMMITTEE_LIMITS, committeeSchema } from '../schemas/committee.schema';
import type { CommitteeInput, CommitteeStatus } from '../types';

// Admin › Map / Committees › Import CSV: columns name, type, city, country, lat, lng, link. Pure,
// so the dialog can show the rows that failed before anything is saved, and the action checks the
// same rules again.

/** Columns the file must have (any order, any case); "link" is optional. */
export const IMPORT_COLUMNS = ['name', 'type', 'city', 'country', 'lat', 'lng'] as const;
export const IMPORT_HEADER = [...IMPORT_COLUMNS, 'link'] as const;

const HEADER_ALIASES: Record<string, string> = { status: 'type', url: 'link', website: 'link' };

const TYPES: Record<string, CommitteeStatus> = {
  lc: 'lc',
  local: 'lc',
  'local committee': 'lc',
  observer: 'observer',
  obs: 'observer',
  jlc: 'jlc',
  junior: 'jlc',
  'junior local committee': 'jlc',
};

export type RowProblem = { field: string; key: string };
export type ImportFailure = {
  /** Line in the file (the header is line 1). */
  line: number;
  name: string;
  problems: RowProblem[];
};

export type ImportPreview = {
  /** Required columns the file doesn't have. */
  missingColumns: string[];
  valid: CommitteeInput[];
  failed: ImportFailure[];
  /** More rows than one import takes. */
  tooMany: boolean;
};

const NUMBER = /^-?\d+(?:[.,]\d+)?$/;
const number = (text: string) => (NUMBER.test(text) ? Number(text.replace(',', '.')) : Number.NaN);

export function previewCommitteeImport(csv: ParsedCsv): ImportPreview {
  const headers = csv.headers.map((header) => HEADER_ALIASES[header] ?? header);
  const missingColumns = IMPORT_COLUMNS.filter((column) => !headers.includes(column));
  if (missingColumns.length > 0)
    return { missingColumns: [...missingColumns], valid: [], failed: [], tooMany: false };

  const rows = csv.rows.slice(0, COMMITTEE_LIMITS.importRows);
  const seen = new Set<string>();
  const valid: CommitteeInput[] = [];
  const failed: ImportFailure[] = [];

  for (const { line, cells: raw } of rows) {
    const cells: Record<string, string> = {};
    csv.headers.forEach((header) => (cells[HEADER_ALIASES[header] ?? header] = raw[header] ?? ''));
    const problems: RowProblem[] = [];
    const status = TYPES[(cells.type ?? '').toLowerCase()];
    const country = countryFromText(cells.country ?? '');
    if (!status) problems.push({ field: 'type', key: cells.type ? 'type' : 'required' });
    if (cells.country && !country) problems.push({ field: 'country', key: 'country' });
    const lat = number(cells.lat ?? '');
    const lng = number(cells.lng ?? '');

    const parsed = committeeSchema.safeParse({
      name: cells.name ?? '',
      status: status ?? 'lc',
      city: { mk: cells.city ?? '', en: cells.city ?? '' },
      country: country ?? '',
      lat: Number.isNaN(lat) ? undefined : lat,
      lng: Number.isNaN(lng) ? undefined : lng,
      url: cells.link ?? '',
      isHome: false,
    });
    if (!parsed.success)
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]);
        // Type and country were reported above, with the words people typed.
        if (field === 'status' || (field === 'country' && problems.some((item) => item.field === 'country')))
          continue;
        if (field === 'city') problems.push({ field, key: issue.message });
        else if (field === 'country' && !cells.country) problems.push({ field, key: 'required' });
        else if (field === 'country') problems.push({ field, key: 'country' });
        else problems.push({ field, key: issue.message });
      }

    const key = `${(cells.name ?? '').toLowerCase()}|${country ?? ''}`;
    if (parsed.success && problems.length === 0) {
      if (seen.has(key)) problems.push({ field: 'name', key: 'duplicate' });
      seen.add(key);
    }
    if (problems.length > 0 || !parsed.success || !status) {
      failed.push({ line, name: cells.name ?? '', problems });
      continue;
    }
    valid.push({ ...parsed.data, status, country: parsed.data.country });
  }

  return { missingColumns: [], valid, failed, tooMany: csv.rows.length > COMMITTEE_LIMITS.importRows };
}
