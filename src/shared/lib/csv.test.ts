import { describe, expect, it } from 'vitest';

import { toCsv } from './csv';

type Row = { name: string; count: number | null };
const columns = [
  { header: 'Name', value: (row: Row) => row.name },
  { header: 'Count', value: (row: Row) => row.count },
];

describe('toCsv', () => {
  it('writes a header, rows, a BOM and CRLF line ends', () => {
    expect(toCsv([{ name: 'RoboMac', count: 3 }], columns)).toBe('﻿Name,Count\r\nRoboMac,3\r\n');
  });

  it('quotes commas, quotes and line breaks', () => {
    expect(toCsv([{ name: 'Skopje, "Ohrid"\nNorth', count: null }], columns)).toContain(
      '"Skopje, ""Ohrid""\nNorth",',
    );
  });

  it('defuses spreadsheet formulas', () => {
    expect(toCsv([{ name: '=HYPERLINK("x")', count: -1 }], columns)).toContain(`"'=HYPERLINK(""x"")",-1`);
  });
});
