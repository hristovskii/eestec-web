import { describe, expect, it } from 'vitest';

import { INQUIRY_LIMITS, inquirySchema, readInquiryForm } from './inquiry';

const valid = {
  company: 'Voltline',
  person: 'Petra Ilievska',
  email: 'petra@voltline.example',
  phone: '',
  interests: ['workshop'],
  message: 'A message that is long enough to send.',
  consent: true,
};
const keys = (input: unknown) => {
  const result = inquirySchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

describe('inquirySchema', () => {
  it('accepts a complete inquiry, and no phone', () => {
    expect(inquirySchema.safeParse(valid).success).toBe(true);
  });

  it('needs company, person, a valid e-mail, an interest, a message of at least 20 characters and consent', () => {
    expect(
      keys({
        ...valid,
        company: ' ',
        person: '',
        email: 'x',
        interests: [],
        message: 'short',
        consent: false,
      }),
    ).toEqual(
      expect.arrayContaining([
        'company:required',
        'person:required',
        'email:email',
        'interests:interests',
        'message:tooShort',
        'consent:consent',
      ]),
    );
  });

  it('limits the message to 2,000 characters', () => {
    expect(keys({ ...valid, message: 'a'.repeat(INQUIRY_LIMITS.message + 1) })).toContain('message:tooLong');
    expect(keys({ ...valid, message: 'a'.repeat(INQUIRY_LIMITS.message) })).toEqual([]);
  });

  it('reads phone numbers people write, and turns the same interest twice into one', () => {
    expect(keys({ ...valid, phone: '+389 2 123 4567' })).toEqual([]);
    expect(keys({ ...valid, phone: 'call me' })).toContain('phone:phone');
    const parsed = inquirySchema.parse({ ...valid, interests: ['workshop', 'workshop', 'other'] });
    expect(parsed.interests).toEqual(['workshop', 'other']);
  });
});

describe('readInquiryForm', () => {
  it('reads every field, several interests, and an unchecked consent as false', () => {
    const data = new FormData();
    data.set('company', 'Voltline');
    data.append('interests', 'workshop');
    data.append('interests', 'other');
    expect(readInquiryForm(data)).toMatchObject({
      company: 'Voltline',
      interests: ['workshop', 'other'],
      consent: false,
      message: '',
    });
    data.set('consent', 'on');
    expect(readInquiryForm(data).consent).toBe(true);
  });
});
