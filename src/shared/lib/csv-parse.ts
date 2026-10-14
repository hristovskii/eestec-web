// Reads a CSV file the way Excel and Google Sheets write it: comma or semicolon (decided from the
// first line), "quoted, cells" with "" for a quote, CRLF or LF, and a BOM. The counterpart of toCsv.

export type ParsedCsv = {
  headers: string[];
  /** One object per data row, keyed by the lower-cased header. `line` is the line in the file (header = 1). */
  rows: { line: number; cells: Record<string, string> }[];
};

function detectDelimiter(text: string): ',' | ';' | '\t' {
  const first = text.slice(0, text.search(/\r?\n|$/));
  // Only count outside quotes.
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  for (const char of first) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && char in counts) counts[char as keyof typeof counts] += 1;
  }
  return counts[';'] > counts[','] ? ';' : counts['\t'] > counts[','] ? '\t' : ',';
}

/** Splits CSV text into records of cells (quotes can contain delimiters and line breaks). */
function records(text: string, delimiter: string): { line: number; cells: string[] }[] {
  const out: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let line = 1;
  let recordLine = 1;
  const endCell = () => {
    cells.push(cell);
    cell = '';
  };
  const endRecord = () => {
    endCell();
    if (cells.some((value) => value.trim() !== '')) out.push({ line: recordLine, cells });
    cells = [];
  };
  for (let index = 0; index < text.length; index++) {
    const char = text[index]!;
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else {
        if (char === '\n') line += 1;
        cell += char;
      }
    } else if (char === '"' && cell === '') quoted = true;
    else if (char === delimiter) endCell();
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      endRecord();
      line += 1;
      recordLine = line;
    } else cell += char;
  }
  if (cell !== '' || cells.length > 0) endRecord();
  return out;
}

export function parseCsv(input: string): ParsedCsv {
  const text = input.replace(/^﻿/, '');
  const [head, ...rest] = records(text, detectDelimiter(text));
  const headers = (head?.cells ?? []).map((header) => header.trim().toLowerCase());
  return {
    headers,
    rows: rest.map(({ line, cells }) => ({
      line,
      cells: Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? '').trim()])),
    })),
  };
}
