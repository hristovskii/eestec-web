/** A JSON-LD node: plain data, so it can be serialised and unit tested. */
export type JsonLd = { [key: string]: JsonLdValue };
type JsonLdValue = string | number | boolean | JsonLd | JsonLdValue[];

/** Makes a path from the site ("/brand/logo.png") absolute; full addresses are left alone. */
export function absoluteUrl(origin: string, address: string): string {
  return new URL(address, origin).href;
}

/** Drops empty values, so a field the board left empty is never emitted. */
export function compact(node: Record<string, JsonLdValue | null | undefined>): JsonLd {
  return Object.fromEntries(
    Object.entries(node).filter(
      (entry): entry is [string, JsonLdValue] =>
        entry[1] !== null &&
        entry[1] !== undefined &&
        entry[1] !== '' &&
        !(Array.isArray(entry[1]) && entry[1].length === 0),
    ),
  );
}

/**
 * JSON for an inline `<script type="application/ld+json">`: `<` and the two line separators are
 * escaped so board text can never close the script tag.
 */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
