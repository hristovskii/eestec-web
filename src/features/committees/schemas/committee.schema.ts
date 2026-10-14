import { z } from 'zod';

import { isCountryCode } from '@/shared/i18n/country';

import { COMMITTEE_STATUSES } from '../types';

// Messages are keys of `admin.committees.errors`.

export const COMMITTEE_LIMITS = { name: 80, city: 80, url: 300, importRows: 500 } as const;

export const committeeSchema = z.object({
  name: z.string().trim().min(1, 'required').max(COMMITTEE_LIMITS.name, 'tooLong'),
  status: z.enum(COMMITTEE_STATUSES, 'required'),
  city: z.object({
    mk: z.string().trim().min(1, 'required').max(COMMITTEE_LIMITS.city, 'tooLong'),
    en: z.string().trim().max(COMMITTEE_LIMITS.city, 'tooLong').optional(),
  }),
  country: z.string().refine(isCountryCode, 'country'),
  lat: z.number('number').min(-90, 'range').max(90, 'range'),
  lng: z.number('number').min(-180, 'range').max(180, 'range'),
  url: z.union([
    z.literal(''),
    z.url({ protocol: /^https?$/, message: 'url' }).max(COMMITTEE_LIMITS.url, 'tooLong'),
  ]),
  isHome: z.boolean(),
});

export type CommitteeDraft = z.input<typeof committeeSchema>;
