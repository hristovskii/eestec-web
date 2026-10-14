import { describe, expect, it } from 'vitest';

import { parseCsv } from './csv-parse';
import { toCsv } from './csv';

describe('parseCsv', () => {
  it('reads headers case-insensitively and cells by header', () => {
    const { headers, rows } = parseCsv('Name,Type\nLC Belgrade,LC\nLC Zagreb,LC\n');
    expect(headers).toEqual(['name', 'type']);
    expect(rows.map((row) => row.cells.name)).toEqual(['LC Belgrade', 'LC Zagreb']);
    expect(rows.map((row) => row.line)).toEqual([2, 3]);
  });

  it('handles a BOM, CRLF, semicolons and blank lines', () => {
    const { headers, rows } = parseCsv('﻿name;lat\r\nLC Skopje;41,99\r\n\r\nLC Ohrid;41,12\r\n');
    expect(headers).toEqual(['name', 'lat']);
    expect(rows).toEqual([
      { line: 2, cells: { name: 'LC Skopje', lat: '41,99' } },
      { line: 4, cells: { name: 'LC Ohrid', lat: '41,12' } },
    ]);
  });

  it('handles quoted cells with delimiters, quotes and line breaks', () => {
    const { rows } = parseCsv('name,link\n"LC ""Skopje"", North","a\nb"\nnext,x');
    expect(rows[0]?.cells).toEqual({ name: 'LC "Skopje", North', link: 'a\nb' });
    expect(rows[1]).toEqual({ line: 4, cells: { name: 'next', link: 'x' } });
  });

  it('pads short rows and ignores extra cells', () => {
    const { rows } = parseCsv('a,b\n1\n1,2,3');
    expect(rows.map((row) => row.cells)).toEqual([
      { a: '1', b: '' },
      { a: '1', b: '2' },
    ]);
  });

  it('reads what toCsv writes (an export can be imported again)', () => {
    const csv = toCsv(
      [{ name: 'LC "A", B', note: 'x' }],
      [
        { header: 'Name', value: (row) => row.name },
        { header: 'Note', value: (row) => row.note },
      ],
    );
    expect(parseCsv(csv).rows[0]?.cells).toEqual({ name: 'LC "A", B', note: 'x' });
  });

  it('returns nothing for an empty file', () => {
    expect(parseCsv('')).toEqual({ headers: [], rows: [] });
  });
});
