import { describe, expect, it } from 'vitest';

import { fieldErrorsFrom } from '@/shared/forms/action-result';

import { buildIdeaSchema, buildImpressionSchema, readIdeaForm, readImpressionForm } from './submission';

const idea = {
  type: 'itype-workshop',
  title: 'A beginner workshop on PCB design',
  description: 'Many first-years want to build hardware but have never designed a board.',
  attachment: null,
  name: '',
  email: '',
  consent: false,
  anonymous: false,
};

const impression = {
  event: 'ev-power-up-2026',
  otherEvent: '',
  rating: 4,
  impression: 'The lab day was the best part.',
  photos: [],
  name: '',
  email: '',
  consent: false,
  anonymous: false,
  asMemory: false,
  memoryTitle: '',
};

const errorsOf = (result: { success: boolean; error?: { issues: never[] } }) =>
  result.success ? {} : fieldErrorsFrom(result.error!.issues);

describe('idea schema', () => {
  const schema = buildIdeaSchema(['itype-workshop'], false);

  it('accepts a complete idea with no name and no e-mail', () => {
    expect(schema.safeParse(idea).success).toBe(true);
  });

  it('names what is missing: type, title, a too short description', () => {
    const errors = errorsOf(
      schema.safeParse({ ...idea, type: '', title: '  ', description: 'PCB' }) as never,
    );
    expect(errors).toEqual({ type: ['type'], title: ['title'], description: ['description'] });
  });

  it('asks for the consent only when an e-mail is typed, and never of a member or an anonymous sender', () => {
    const withMail = { ...idea, email: 'bojan@example.org' };
    expect(errorsOf(schema.safeParse(withMail) as never)).toEqual({ consent: ['consent'] });
    expect(schema.safeParse({ ...withMail, consent: true }).success).toBe(true);
    expect(schema.safeParse({ ...withMail, anonymous: true }).success).toBe(true);
    expect(buildIdeaSchema(['itype-workshop'], true).safeParse(withMail).success).toBe(true);
    expect(errorsOf(schema.safeParse({ ...idea, email: 'not-an-address' }) as never)).toEqual({
      email: ['email'],
    });
  });

  it('checks the attachment: PDF, JPG or PNG up to 4 MB', () => {
    const file = (type: string, size = 1000) => ({ name: 'plan', type, size });
    expect(schema.safeParse({ ...idea, attachment: file('application/pdf') }).success).toBe(true);
    expect(errorsOf(schema.safeParse({ ...idea, attachment: file('text/html') }) as never)).toEqual({
      attachment: ['attachmentType'],
    });
    expect(
      errorsOf(schema.safeParse({ ...idea, attachment: file('image/png', 5 * 1024 * 1024) }) as never),
    ).toEqual({ attachment: ['attachmentSize'] });
  });

  it('refuses a type the board does not offer', () => {
    expect(schema.safeParse({ ...idea, type: 'itype-gone' }).success).toBe(false);
  });
});

describe('impression schema', () => {
  const schema = buildImpressionSchema(['ev-power-up-2026'], true);

  it('accepts an impression of a listed event, rated or not', () => {
    expect(schema.safeParse(impression).success).toBe(true);
    expect(schema.safeParse({ ...impression, rating: null }).success).toBe(true);
  });

  it('wants an event, and a name for "Other"', () => {
    expect(errorsOf(schema.safeParse({ ...impression, event: '' }) as never)).toEqual({ event: ['event'] });
    expect(errorsOf(schema.safeParse({ ...impression, event: '__other__' }) as never)).toEqual({
      otherEvent: ['otherEvent'],
    });
    expect(schema.safeParse({ ...impression, event: '__other__', otherEvent: 'Study visit' }).success).toBe(
      true,
    );
  });

  it('wants a sentence, and a title for the Memory when it is also one', () => {
    expect(errorsOf(schema.safeParse({ ...impression, impression: 'ok' }) as never)).toEqual({
      impression: ['impression'],
    });
    expect(errorsOf(schema.safeParse({ ...impression, asMemory: true }) as never)).toEqual({
      memoryTitle: ['memoryTitle'],
    });
    expect(schema.safeParse({ ...impression, asMemory: true, memoryTitle: 'Lab day' }).success).toBe(true);
  });

  it('allows ten photos of an image type, each up to 400 KB', () => {
    const photo = { name: 'a.jpg', type: 'image/jpeg', size: 1000 };
    expect(schema.safeParse({ ...impression, photos: Array(10).fill(photo) }).success).toBe(true);
    expect(errorsOf(schema.safeParse({ ...impression, photos: Array(11).fill(photo) }) as never)).toEqual({
      photos: ['photoCount'],
    });
    expect(
      errorsOf(schema.safeParse({ ...impression, photos: [{ ...photo, type: 'application/pdf' }] }) as never),
    ).toEqual({ photos: ['photoType'] });
    expect(
      errorsOf(schema.safeParse({ ...impression, photos: [{ ...photo, size: 401 * 1024 }] }) as never),
    ).toEqual({ photos: ['photoSize'] });
  });
});

describe('reading the form', () => {
  it('reads both tabs from FormData, an empty file input as no file', () => {
    const data = new FormData();
    data.set('title', 'A title');
    data.set('anonymous', 'on');
    data.set('attachment', new File([], ''));
    expect(readIdeaForm(data)).toMatchObject({
      title: 'A title',
      anonymous: true,
      attachment: null,
      consent: false,
    });
    const photos = new FormData();
    photos.set('rating', '5');
    photos.append('photos', new File(['x'], 'a.jpg', { type: 'image/jpeg' }));
    photos.append('photos', new File([], ''));
    expect(readImpressionForm(photos)).toMatchObject({
      rating: 5,
      photos: [{ name: 'a.jpg', size: 1, type: 'image/jpeg' }],
    });
    expect(readImpressionForm(new FormData()).rating).toBeNull();
  });
});
