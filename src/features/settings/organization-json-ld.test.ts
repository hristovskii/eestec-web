import { describe, expect, it } from 'vitest';

import { organizationJsonLd } from './organization-json-ld';
import type { SiteSettings } from './types';

const asset = {
  mediaId: null,
  src: '/brand/LC_Skopje_red.png',
  fileName: 'x',
  width: 1,
  height: 1,
  alt: 'Logo',
};

function settings(overrides: Partial<SiteSettings> = {}): SiteSettings {
  return {
    siteName: 'EESTEC LC Skopje',
    footerTagline: '',
    branding: { fullColor: asset, white: asset, icon: asset },
    contact: { mainEmail: 'hello@eestec.mk', address: 'Karposh 2, Skopje', officeRoom: '' },
    weeklyMeeting: {
      day: 'thursday',
      time: '19:00',
      room: '',
      showOnHome: false,
      nextAt: '2026-01-01T00:00:00Z',
    },
    boardRoles: [],
    socialLinks: [
      { platform: 'instagram', handle: '@eestec_skopje', url: 'https://instagram.com/eestec_skopje' },
    ],
    legal: {
      fullName: 'Association of Students EESTEC LC Skopje',
      shortName: '',
      registrationNumber: '',
      taxNumber: '',
      bankAccount: '',
      bankName: '',
      registeredSeat: '',
    },
    events: {
      deadlineSoonHours: 72,
      justEndedDays: 14,
      defaultMaxParticipants: 24,
      defaultWaitlistEnabled: true,
      autoCloseApplications: true,
    },
    retentionMonths: 12,
    currentYear: 2026,
    ...overrides,
  };
}

describe('organizationJsonLd', () => {
  it('names the association with its logo, profiles and address', () => {
    expect(organizationJsonLd(settings(), 'https://eestec.mk')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'EESTEC LC Skopje',
      legalName: 'Association of Students EESTEC LC Skopje',
      url: 'https://eestec.mk',
      logo: 'https://eestec.mk/brand/LC_Skopje_red.png',
      email: 'hello@eestec.mk',
      address: 'Karposh 2, Skopje',
      sameAs: ['https://instagram.com/eestec_skopje'],
    });
  });

  it('leaves out what the board has not filled in', () => {
    const node = organizationJsonLd(
      settings({ socialLinks: [], contact: { mainEmail: '', address: '', officeRoom: '' } }),
      'https://eestec.mk',
    );
    for (const key of ['sameAs', 'email', 'address']) expect(node).not.toHaveProperty(key);
  });
});
