import type { Localized } from '@/shared/types/localized';
import type { MediaRef } from '@/shared/types/media';

/** Icons of the cards on the For Companies page (the canvas's six, plus four). */
export const PARTNER_ICONS = [
  'users',
  'star',
  'chip',
  'briefcase',
  'mic',
  'flag',
  'handshake',
  'megaphone',
  'graduation',
  'globe',
] as const;
export type PartnerIcon = (typeof PARTNER_ICONS)[number];

/** The tabs of Admin › Pages › Sponsors. */
export const PARTNERS_TABS = ['page', 'sponsors', 'tiers'] as const;
export type PartnersTab = (typeof PARTNERS_TABS)[number];

// ─── Tiers and sponsors (data-model.md: sponsor_tiers, sponsors) ───

/** How big the logos of a tier are: large = the main partner's cell, medium = gold, small = the rest. */
export const TIER_SIZES = ['large', 'medium', 'small'] as const;
export type TierSize = (typeof TIER_SIZES)[number];

export type SponsorTier = {
  id: string;
  name: Localized;
  /** The order of the tiers is the order of the list. */
  size: TierSize;
};

export type Sponsor = {
  id: string;
  name: string;
  /** A library image (SVG or PNG) with its alt text; none: the name is shown as text (FEEIT, UKIM). */
  logo: MediaRef | null;
  websiteUrl: string;
  tierId: string;
  /** "2026-09-01"; empty means "since always". */
  activeFrom: string;
  /** "2027-08-31"; empty means "no end". In the past: a past partner. */
  activeTo: string;
  isActive: boolean;
};

// ─── The page (data-model.md: page_blocks partners, partner_packages) ───

export type PartnerCard = { id: string; icon: PartnerIcon; title: Localized; text: Localized };

export type PartnerPackage = {
  id: string;
  name: Localized;
  text: Localized;
  /** Optional ("from 1,500 EUR"); the canvas leaves prices to the offer, so empty hides it. */
  priceText: Localized;
  items: { id: string; text: Localized }[];
  /** The "Most chosen" card. */
  highlighted: boolean;
  /** "Ask about Gold". */
  cta: Localized;
};

/** Everything the "Page" tab of Admin › Pages › Sponsors edits, in both languages. */
export type PartnersPageRecord = {
  hero: {
    eyebrow: Localized;
    title: Localized;
    lead: Localized;
    primaryLabel: Localized;
    /** "Partnership offer (PDF)": the button label; the size comes from the library file. */
    offerLabel: Localized;
  };
  reach: { title: Localized; stats: { id: string; value: Localized; label: Localized }[] };
  why: { eyebrow: Localized; title: Localized; cards: PartnerCard[] };
  packages: {
    eyebrow: Localized;
    title: Localized;
    note: Localized;
    badge: Localized;
    items: PartnerPackage[];
    singlesTitle: Localized;
    singles: PartnerCard[];
  };
  offer: {
    /** The PDF in the Media library. */
    mediaId: string;
    title: Localized;
    text: Localized;
    /** "14 pages" (free text: a PDF's page count is not in the library). */
    pages: Localized;
    downloadLabel: Localized;
  };
  partners: { eyebrow: Localized; title: Localized; pastTitle: Localized };
  contact: {
    eyebrow: Localized;
    title: Localized;
    text: Localized;
    person: { name: string; role: Localized; email: string };
  };
};

export type PartnersPageInput = PartnersPageRecord;

// ─── What the public pages show ───

export type PublicSponsor = {
  id: string;
  name: string;
  url: string;
  /** null: no logo, the name is shown as text. */
  logo: { src: string; alt: string; width: number; height: number } | null;
  /** Past partners only: "2018–2022". */
  years?: string;
};

export type PublicTier = { id: string; name: string; size: TierSize; sponsors: PublicSponsor[] };

export type PublicPartnersPage = {
  hero: { eyebrow: string; title: string; lead: string; primaryLabel: string; offerLabel: string };
  reach: { title: string; stats: { id: string; value: string; label: string }[] };
  why: {
    eyebrow: string;
    title: string;
    cards: { id: string; icon: PartnerIcon; title: string; text: string }[];
  };
  packages: {
    eyebrow: string;
    title: string;
    note: string;
    badge: string;
    items: {
      id: string;
      name: string;
      text: string;
      priceText: string;
      items: string[];
      highlighted: boolean;
      cta: string;
    }[];
    singlesTitle: string;
    singles: { id: string; icon: PartnerIcon; title: string; text: string }[];
  };
  offer: {
    title: string;
    text: string;
    pages: string;
    downloadLabel: string;
    /** null: the library item is a SAMPLE without a file. */
    file: { src: string } | null;
    size: number;
  } | null;
  partners: { eyebrow: string; title: string; pastTitle: string };
  contact: {
    eyebrow: string;
    title: string;
    text: string;
    person: { name: string; role: string; email: string };
  };
  /** Active partners by tier, empty tiers left out. */
  tiers: PublicTier[];
  /** Partners whose "active to" date has passed. */
  past: PublicSponsor[];
};

// ─── Partnership inquiries (CompanyForm; data-model.md: partner_inquiries) ───

/** What the company is interested in (pick any). */
export const INQUIRY_INTERESTS = ['sponsorship', 'workshop', 'job_fair', 'other'] as const;
export type InquiryInterest = (typeof INQUIRY_INTERESTS)[number];

/** The board's handling of an inquiry (Inbox › Partners, M12). */
export const INQUIRY_STATUSES = ['new', 'in_progress', 'done'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export type PartnerInquiry = {
  id: string;
  /** "PRT-2026-0017": what the company can quote and the board can search for (D6). */
  reference: string;
  company: string;
  contactPerson: string;
  email: string;
  phone: string;
  interests: InquiryInterest[];
  message: string;
  locale: 'mk' | 'en';
  consentAt: string;
  status: InquiryStatus;
  /** When someone on the board opened it; null: unread. */
  readAt: string | null;
  createdAt: string;
};

export type PartnerInquiryInput = Omit<
  PartnerInquiry,
  'id' | 'reference' | 'status' | 'readAt' | 'createdAt' | 'consentAt'
>;
