import type { Localized } from '@/shared/types/localized';

import type { PartnerCard, PartnersPageRecord, Sponsor, SponsorTier } from '../../types';

// SAMPLE DATA, transcribed from handoff/design-source/PartnersPage.dc.html, PartnerLogos.dc.html and
// PartnersStates.dc.html (docs/sample-data.md). The companies are the canvas's fictional ones, the
// packages and their contents are its examples: **the board decides the real ones**. The canvas is
// English only, so Macedonian reuses the English text until the board supplies it (D14). No prices
// are invented: the canvas leaves them to the partnership offer.

const both = (text: string): Localized => ({ mk: text, en: text });
const card = (id: string, icon: PartnerCard['icon'], title: string, text: string): PartnerCard => ({
  id,
  icon,
  title: both(title),
  text: both(text),
});
const items = (prefix: string, texts: string[]) =>
  texts.map((text, index) => ({ id: `${prefix}-${index + 1}`, text: both(text) }));

export const partnersPageFixture: PartnersPageRecord = {
  hero: {
    eyebrow: both('For Companies'),
    title: both('Meet the engineers of tomorrow'),
    lead: both(
      'Partner with EESTEC LC Skopje to reach electrical engineering and computer science students at FEEIT and across Europe.',
    ),
    primaryLabel: both('Get in touch'),
    offerLabel: both('Partnership offer'),
  },
  reach: {
    title: both('Who you reach'),
    stats: [
      { id: 'reach-1', value: both('1,200+'), label: both('students at our events each year') },
      { id: 'reach-2', value: both('80'), label: both('active LC Skopje members') },
      { id: 'reach-3', value: both('25+'), label: both('local and international events a year') },
      { id: 'reach-4', value: both('5,000+'), label: both('students in the EESTEC network') },
    ],
  },
  why: {
    eyebrow: both('Why partner with us'),
    title: both('What your company gets'),
    cards: [
      card(
        'why-1',
        'users',
        'Reach EE & CS students',
        'Meet motivated students of electrical engineering and computer science before they graduate.',
      ),
      card(
        'why-2',
        'star',
        'Employer branding',
        'Your logo and story at our events, on our website and on our social media.',
      ),
      card(
        'why-3',
        'chip',
        'Workshops',
        'Run a hands-on workshop or tech talk on your own technology, for students who chose to be there.',
      ),
      card(
        'why-4',
        'briefcase',
        'Career events',
        'A stand at our job fair and career day, plus job posts shared with our members.',
      ),
    ],
  },
  packages: {
    eyebrow: both('Collaboration options'),
    title: both('Ways to work together'),
    note: both(
      'Prices and full details are in the partnership offer. Every package can be adjusted to your goals.',
    ),
    badge: both('Most chosen'),
    items: [
      {
        id: 'package-partner',
        name: both('Partner'),
        text: both('A simple way to support students and get visibility.'),
        priceText: both(''),
        items: items('package-partner-item', [
          'Logo on the website and at one event',
          'Thank-you post on our social media',
          'Invitation to our partner day',
        ]),
        highlighted: false,
        cta: both('Ask about Partner'),
      },
      {
        id: 'package-gold',
        name: both('Gold partner'),
        text: both('Regular contact with students through the year.'),
        priceText: both(''),
        items: items('package-gold-item', [
          'Everything in Partner',
          'Bigger logo on the Home page',
          'One company workshop or tech talk a year',
          'A stand at the job fair',
          'Job posts shared with members',
        ]),
        highlighted: true,
        cta: both('Ask about Gold'),
      },
      {
        id: 'package-main',
        name: both('Main partner'),
        text: both('The strongest presence, including our international events.'),
        priceText: both(''),
        items: items('package-main-item', [
          'Everything in Gold',
          'Largest logo, first on the Home page',
          'Branding at our international workshop',
          'Two workshops a year and a company visit',
          'Access to CVs of members who opt in',
        ]),
        highlighted: false,
        cta: both('Ask about Main partner'),
      },
    ],
    singlesTitle: both('Or pick a single collaboration'),
    singles: [
      card('single-1', 'chip', 'Company workshop', 'A half-day or full-day hands-on session.'),
      card('single-2', 'mic', 'Tech talk', 'A 45-minute talk at FEEIT with Q&A.'),
      card('single-3', 'briefcase', 'Job fair stand', 'Meet students at our yearly job fair.'),
      card('single-4', 'flag', 'Event sponsorship', 'Support one event and be seen there.'),
    ],
  },
  offer: {
    mediaId: 'media-doc-offer',
    title: both('Partnership offer 2026/27'),
    text: both('All packages, prices and last year’s results in one document.'),
    pages: both('14 pages'),
    downloadLabel: both('Download PDF'),
  },
  partners: {
    eyebrow: both('Our partners'),
    title: both('Companies that already work with us'),
    pastTitle: both('Past partners'),
  },
  contact: {
    eyebrow: both('Contact'),
    title: both('Let’s talk'),
    text: both('Tell us what you have in mind. We’ll suggest the best format and send you the details.'),
    person: {
      name: 'Ivana Kostova',
      role: both('Head of Fundraising, EESTEC LC Skopje'),
      email: 'partners@eestec.mk',
    },
  },
};

export const tiersFixture: SponsorTier[] = [
  { id: 'tier-main', name: both('Main partner'), size: 'large' },
  { id: 'tier-gold', name: both('Gold partners'), size: 'medium' },
  // The canvas's example of an empty tier: it is hidden until a Silver partner is added.
  { id: 'tier-silver', name: both('Silver partners'), size: 'medium' },
  { id: 'tier-partners', name: both('Partners'), size: 'small' },
  { id: 'tier-media', name: both('Media partners'), size: 'small' },
  { id: 'tier-academic', name: both('Academic partners'), size: 'small' },
];

const logo = (slug: string, name: string): Sponsor['logo'] => ({
  mediaId: `media-sponsor-${slug}`,
  alt: both(`${name} logo`),
});
const sponsor = (
  slug: string,
  name: string,
  tierId: string,
  period: { from?: string; to?: string } = {},
): Sponsor => ({
  id: `sponsor-${slug}`,
  name,
  logo: logo(slug, name),
  // Sample companies have no real site: example.com is reserved for exactly this.
  websiteUrl: `https://${slug}.example.com`,
  tierId,
  activeFrom: period.from ?? '2025-09-01',
  activeTo: period.to ?? '',
  isActive: true,
});
const placeholder = (slug: string, name: string, tierId: string): Sponsor => ({
  id: `sponsor-${slug}`,
  name,
  logo: null,
  websiteUrl: '',
  tierId,
  activeFrom: '2025-09-01',
  activeTo: '',
  isActive: true,
});

export const sponsorsFixture: Sponsor[] = [
  sponsor('voltline', 'Voltline', 'tier-main'),
  sponsor('gridnova', 'Gridnova', 'tier-gold'),
  sponsor('kodra', 'Kodra', 'tier-gold'),
  sponsor('amperix', 'Amperix Systems', 'tier-gold'),
  sponsor('circuitlab', 'Circuitlab', 'tier-partners'),
  sponsor('quarkwave', 'Quark Wave Technologies', 'tier-partners'),
  sponsor('ferrolux', 'Ferrolux', 'tier-partners'),
  sponsor('bitforge', 'Bitforge', 'tier-partners'),
  sponsor('lumenix', 'Lumenix', 'tier-partners'),
  sponsor('teravolt', 'Teravolt', 'tier-partners'),
  sponsor('datanest', 'Datanest', 'tier-partners'),
  sponsor('signalpost', 'Signalpost', 'tier-media'),
  sponsor('campusfm', 'Campus FM 98', 'tier-media'),
  sponsor('techwire', 'Techwire Daily', 'tier-media'),
  placeholder('feeit', 'FEEIT', 'tier-academic'),
  placeholder('ukim', 'UKIM', 'tier-academic'),
  // Past partners: their "active to" date has passed, so they show on /partners with their years.
  sponsor('orbitel', 'Orbitel', 'tier-partners', { from: '2018-09-01', to: '2022-08-31' }),
  sponsor('hexacore', 'Hexacore', 'tier-partners', { from: '2020-09-01', to: '2023-08-31' }),
  sponsor('polaris', 'Polaris Instruments', 'tier-partners', { from: '2016-09-01', to: '2021-08-31' }),
  sponsor('nexagrid', 'Nexa Grid', 'tier-partners', { from: '2019-09-01', to: '2024-08-31' }),
];
