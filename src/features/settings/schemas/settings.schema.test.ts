import { describe, expect, it } from 'vitest';

import { settingsFixture } from '../data/fixtures/settings';
import { changedSections, settingsInputSchema } from './settings.schema';

const { privacy: _privacy, ...input } = settingsFixture;

const issues = (value: unknown) => {
  const result = settingsInputSchema.safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

describe('settings schema', () => {
  it('accepts the sample settings', () => {
    expect(issues(input)).toEqual([]);
  });

  it('returns message keys at field paths', () => {
    expect(
      issues({
        ...input,
        siteName: ' ',
        events: { ...input.events, deadlineSoonHours: 0 },
        weeklyMeeting: { ...input.weeklyMeeting, time: '25:00' },
        boardRoles: [{ id: 'r1', title: 'Chair', email: 'not-an-email' }],
        notifications: { ...input.notifications, contactMessages: { enabled: true, recipients: [] } },
      }),
    ).toEqual([
      'siteName:required',
      'weeklyMeeting.time:time',
      'boardRoles.0.email:email',
      'events.deadlineSoonHours:range',
      'notifications.contactMessages.recipients:recipientsRequired',
    ]);
  });

  it('allows empty English text and empty social links', () => {
    expect(
      issues({
        ...input,
        footerTagline: { mk: 'Текст' },
        socialLinks: [{ platform: 'facebook', handle: '', url: '' }],
      }),
    ).toEqual([]);
  });

  it('names the sections that changed, in page order', () => {
    expect(changedSections(input, input)).toEqual([]);
    expect(
      changedSections(input, {
        ...input,
        retentionMonths: 6,
        siteName: 'X',
        boardRoles: [],
      }),
    ).toEqual(['branding', 'contact', 'security']);
  });
});
