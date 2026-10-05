// CSV downloads (Export CSV on admin lists). Excel opens UTF-8 only with a byte-order mark, and a
// cell starting with = + - @ would run as a formula there, so such cells get a leading apostrophe.

export type CsvColumn<T> = { header: string; value: (row: T) => string | number | null | undefined };

const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'number' ? String(value) : FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** The rows as CSV text (with BOM, CRLF line ends). */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const lines = [
    columns.map((column) => cell(column.header)).join(','),
    ...rows.map((row) => columns.map((column) => cell(column.value(row))).join(',')),
  ];
  return `﻿${lines.join('\r\n')}\r\n`;
}
