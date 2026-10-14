import { describe, expect, it } from 'vitest';

import { partnersPageFixture, sponsorsFixture, tiersFixture } from '../data/fixtures/partners';
import { partnersPageSchema, sponsorSchema, tiersSchema } from './partners.schema';

const messages = (result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => result.error?.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`) ?? [];

describe('partnersPageSchema', () => {
  it('accepts the sample content', () => {
    expect(partnersPageSchema.safeParse(partnersPageFixture).success).toBe(true);
  });

  it('needs Macedonian text where the page needs it, and English stays optional', () => {
    const page = structuredClone(partnersPageFixture);
    page.hero.title = { mk: '', en: 'Only English' };
    expect(messages(partnersPageSchema.safeParse(page))).toContain('hero.title.mk:required');
    page.hero.title = { mk: 'Само македонски' };
    expect(partnersPageSchema.safeParse(page).success).toBe(true);
  });

  it('allows only one “Most chosen” package', () => {
    const page = structuredClone(partnersPageFixture);
    page.packages.items.forEach((item) => void (item.highlighted = true));
    expect(messages(partnersPageSchema.safeParse(page))).toContain('packages.items:oneHighlight');
  });

  it('limits the lists and checks the contact e-mail', () => {
    const page = structuredClone(partnersPageFixture);
    page.reach.stats = Array.from({ length: 5 }, (_, index) => ({
      ...page.reach.stats[0]!,
      id: `r${index}`,
    }));
    page.contact.person.email = 'not-an-email';
    expect(messages(partnersPageSchema.safeParse(page))).toEqual(
      expect.arrayContaining(['reach.stats:tooMany', 'contact.person.email:email']),
    );
  });

  it('lets the offer be left out', () => {
    const page = structuredClone(partnersPageFixture);
    page.offer.mediaId = '';
    expect(partnersPageSchema.safeParse(page).success).toBe(true);
  });
});

describe('sponsorSchema', () => {
  const valid = {
    name: 'Voltline',
    logo: null,
    websiteUrl: 'https://voltline.example.com',
    tierId: 'tier-main',
    activeFrom: '2025-09-01',
    activeTo: '',
    isActive: true,
  };

  it('accepts a sponsor with no logo and no website (FEEIT, UKIM)', () => {
    expect(sponsorSchema.safeParse({ ...valid, websiteUrl: '' }).success).toBe(true);
  });

  it('needs a name, a tier and an https website when there is one', () => {
    expect(messages(sponsorSchema.safeParse({ ...valid, name: ' ', tierId: '' }))).toEqual(
      expect.arrayContaining(['name:required', 'tierId:required']),
    );
    expect(messages(sponsorSchema.safeParse({ ...valid, websiteUrl: 'http://x.example.com' }))).toContain(
      'websiteUrl:url',
    );
    expect(messages(sponsorSchema.safeParse({ ...valid, websiteUrl: 'voltline.com' }))).toContain(
      'websiteUrl:url',
    );
  });

  it('needs alt text (Macedonian) for a logo', () => {
    const logo = { mediaId: 'media-sponsor-voltline', alt: { mk: '' } };
    expect(messages(sponsorSchema.safeParse({ ...valid, logo }))).toContain('logo.alt.mk:required');
  });

  it('checks the dates and that the end is not before the start', () => {
    expect(messages(sponsorSchema.safeParse({ ...valid, activeFrom: '1 Sep 2025' }))).toContain(
      'activeFrom:date',
    );
    expect(
      messages(sponsorSchema.safeParse({ ...valid, activeFrom: '2026-02-01', activeTo: '2026-01-01' })),
    ).toContain('activeTo:range');
  });

  it('accepts every sample sponsor', () => {
    for (const { id: _id, ...sponsor } of sponsorsFixture) {
      expect(sponsorSchema.safeParse(sponsor).success, sponsor.name).toBe(true);
    }
  });
});

describe('tiersSchema', () => {
  it('accepts the sample tiers', () => {
    expect(tiersSchema.safeParse(tiersFixture).success).toBe(true);
  });

  it('needs at least one tier, at most eight, each with a Macedonian name and a unique id', () => {
    expect(messages(tiersSchema.safeParse([]))).toContain(':tooFew');
    const many = Array.from({ length: 9 }, (_, index) => ({ ...tiersFixture[0]!, id: `t${index}` }));
    expect(messages(tiersSchema.safeParse(many))).toContain(':tooMany');
    expect(messages(tiersSchema.safeParse([{ ...tiersFixture[0]!, name: { mk: '' } }]))).toContain(
      '0.name.mk:required',
    );
    expect(messages(tiersSchema.safeParse([tiersFixture[0]!, tiersFixture[0]!]))).toContain(':unexpected');
  });
});
