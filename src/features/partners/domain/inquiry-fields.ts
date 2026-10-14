import type { SpamVerdict } from '@/shared/forms/spam-guard';

// The partnership inquiry form (CompanyForm): what is asked, how it is read from the browser's
// FormData, and the one schema the browser and the server both check. Messages are keys of
// `partners.form.errors`.

export const INQUIRY_LIMITS = {
  company: 100,
  person: 80,
  email: 254,
  phone: 30,
  message: 2000,
  minMessage: 20,
} as const;

/** Names of the form's fields (ids in the page are prefixed with `inquiry-`). */
export const INQUIRY_FIELDS = {
  company: 'company',
  person: 'person',
  email: 'email',
  phone: 'phone',
  interests: 'interests',
  message: 'message',
  consent: 'consent',
} as const;

export type InquiryValues = {
  company: string;
  person: string;
  email: string;
  phone: string;
  interests: string[];
  message: string;
  consent: boolean;
};

const text = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
};

export function readInquiryForm(data: FormData): InquiryValues {
  return {
    company: text(data, INQUIRY_FIELDS.company),
    person: text(data, INQUIRY_FIELDS.person),
    email: text(data, INQUIRY_FIELDS.email),
    phone: text(data, INQUIRY_FIELDS.phone),
    interests: data
      .getAll(INQUIRY_FIELDS.interests)
      .filter((value): value is string => typeof value === 'string'),
    message: text(data, INQUIRY_FIELDS.message),
    consent: data.get(INQUIRY_FIELDS.consent) !== null,
  };
}

export type InquiryFailure = 'spam' | 'tooFast' | 'unexpected';

export const inquiryFailureFor = (verdict: Exclude<SpamVerdict, 'ok'>): 'spam' | 'tooFast' =>
  verdict === 'bot' ? 'spam' : 'tooFast';
