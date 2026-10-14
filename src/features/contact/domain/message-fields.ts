import type { SpamVerdict } from '@/shared/forms/spam-guard';

// The contact form (ContactForm): what is asked, how it is read from the browser's FormData, and
// the one schema the browser and the server both check. Messages are keys of `contact.form.errors`.

export const MESSAGE_LIMITS = {
  name: 100,
  email: 254,
  message: 2000,
} as const;

/** Names of the form's fields (ids in the page are prefixed with `ct-`). */
export const MESSAGE_FIELDS = {
  name: 'name',
  email: 'email',
  subject: 'subject',
  message: 'message',
  consent: 'consent',
} as const;

export type MessageValues = {
  name: string;
  email: string;
  subject: string;
  message: string;
  consent: boolean;
};

const text = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
};

export function readContactForm(data: FormData): MessageValues {
  return {
    name: text(data, MESSAGE_FIELDS.name),
    email: text(data, MESSAGE_FIELDS.email),
    subject: text(data, MESSAGE_FIELDS.subject),
    message: text(data, MESSAGE_FIELDS.message),
    consent: data.get(MESSAGE_FIELDS.consent) !== null,
  };
}

export type MessageFailure = 'spam' | 'tooFast' | 'unexpected';

export const messageFailureFor = (verdict: Exclude<SpamVerdict, 'ok'>): 'spam' | 'tooFast' =>
  verdict === 'bot' ? 'spam' : 'tooFast';
