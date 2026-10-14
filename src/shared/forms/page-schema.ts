import { z } from 'zod';

// Building blocks of the page editors' schemas (Home, Journey, Join Us…). Messages are keys the
// page's `admin.<page>.errors` translates: required, tooLong, url, number, range, tooMany.

export const text = (max: number) => z.string().trim().max(max, 'tooLong');
export const required = (max: number) => text(max).min(1, 'required');

/** { mk, en? }: Macedonian required when `mkRequired`, English always optional (D8). */
export const localized = (max: number, mkRequired = false) =>
  z.object({ mk: mkRequired ? required(max) : text(max), en: text(max).optional() });

/** "/join" (a page of this site) or an https link. */
export const siteHref = (max: number) =>
  z
    .string()
    .trim()
    .min(1, 'required')
    .max(max, 'tooLong')
    .refine(
      (value) => /^\/(?!\/)\S*$/.test(value) || z.url({ protocol: /^https$/ }).safeParse(value).success,
      'url',
    );

/** A library photo with the alt text of this use (Macedonian required). */
export const mediaRef = (maxAlt: number) =>
  z.object({ mediaId: z.string().min(1, 'required'), alt: localized(maxAlt, true) });

export const rowId = z.string().regex(/^[\w-]{1,64}$/, 'unexpected');

export const whole = ([min, max]: readonly [number, number]) =>
  z.number('number').int('number').min(min, 'range').max(max, 'range');
