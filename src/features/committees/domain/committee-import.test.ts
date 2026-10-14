import { describe, expect, it } from 'vitest';

import { parseCsv } from '@/shared/lib/csv-parse';

import { previewCommitteeImport } from './committee-import';

const preview = (csv: string) => previewCommitteeImport(parseCsv(csv));
const HEADER = 'name,type,city,country,lat,lng,link\n';

describe('previewCommitteeImport', () => {
  it('accepts a good file: types, countries and numbers as people write them', () => {
    const result = preview(
      HEADER +
        'LC Belgrade,LC,Belgrade,Serbia,44.82,20.46,https://example.org\n' +
        'Observer Podgorica,observer,Podgorica,ME,"42,44","19,26",\n' +
        'JLC Sofia,Junior Local Committee,Sofia,Bulgaria,42.7,23.32,\n',
    );
    expect(result.failed).toEqual([]);
    expect(result.valid).toEqual([
      {
        name: 'LC Belgrade',
        status: 'lc',
        city: { mk: 'Belgrade', en: 'Belgrade' },
        country: 'RS',
        lat: 44.82,
        lng: 20.46,
        url: 'https://example.org',
        isHome: false,
      },
      {
        name: 'Observer Podgorica',
        status: 'observer',
        city: { mk: 'Podgorica', en: 'Podgorica' },
        country: 'ME',
        lat: 42.44,
        lng: 19.26,
        url: '',
        isHome: false,
      },
      {
        name: 'JLC Sofia',
        status: 'jlc',
        city: { mk: 'Sofia', en: 'Sofia' },
        country: 'BG',
        lat: 42.7,
        lng: 23.32,
        url: '',
        isHome: false,
      },
    ]);
  });

  it('accepts a semicolon file with other header names and no link column', () => {
    const result = preview('Name;Status;City;Country;Lat;Lng\nLC Zagreb;LC;Zagreb;Croatia;45,81;15,98\n');
    expect(result.valid.map((row) => row.name)).toEqual(['LC Zagreb']);
  });

  it('names the columns a file is missing', () => {
    const result = preview('name,city\nLC Zagreb,Zagreb\n');
    expect(result.missingColumns).toEqual(['type', 'country', 'lat', 'lng']);
    expect(result.valid).toEqual([]);
  });

  it('lists the rows that failed, with the line and the problem of each field', () => {
    const result = preview(
      HEADER +
        'LC Good,LC,Good,Serbia,44,20,\n' +
        ',LC,Nowhere,Serbia,44,20,\n' +
        'LC Atlantis,LC,Atlantis,Atlantis,44,20,\n' +
        'LC Far,LC,Far,Serbia,95,20,\n' +
        'LC Text,LC,Text,Serbia,north,20,\n' +
        'LC Type,Member,Type,Serbia,44,20,\n' +
        'LC Link,LC,Link,Serbia,44,20,ftp://files\n',
    );
    expect(result.valid.map((row) => row.name)).toEqual(['LC Good']);
    expect(result.failed.map((row) => [row.line, row.problems])).toEqual([
      [3, [{ field: 'name', key: 'required' }]],
      [4, [{ field: 'country', key: 'country' }]],
      [5, [{ field: 'lat', key: 'range' }]],
      [6, [{ field: 'lat', key: 'number' }]],
      [7, [{ field: 'type', key: 'type' }]],
      [8, [{ field: 'url', key: 'url' }]],
    ]);
  });

  it('flags a committee that appears twice in the file', () => {
    const result = preview(HEADER + 'LC A,LC,A,Serbia,44,20,\nlc a,LC,A,SERBIA,44,20,\n');
    expect(result.valid).toHaveLength(1);
    expect(result.failed).toEqual([
      { line: 3, name: 'lc a', problems: [{ field: 'name', key: 'duplicate' }] },
    ]);
  });

  it('stops at 500 rows and says so', () => {
    const rows = Array.from({ length: 501 }, (_, i) => `LC ${i},LC,C${i},Serbia,44,20,\n`).join('');
    const result = preview(HEADER + rows);
    expect(result.valid).toHaveLength(500);
    expect(result.tooMany).toBe(true);
  });
});
