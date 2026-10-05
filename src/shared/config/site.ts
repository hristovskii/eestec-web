// Static, non-editable site constants. Everything the board edits comes from the settings feature.
export const SITE_URL = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000'),
);

export type NavEntry<K extends string> = {
  key: K;
  href: string;
  /** Needs member accounts: hidden in Phase 1. */ phase2?: boolean;
};

export type NavKey = 'home' | 'events' | 'upcoming' | 'members' | 'memories' | 'journey' | 'join' | 'contact';
export type FooterNavKey =
  'events' | 'upcoming' | 'members' | 'memories' | 'journey' | 'join' | 'submit' | 'partners' | 'contact';

/** Main navigation in canvas order (Header). */
export const MAIN_NAV: readonly NavEntry<NavKey>[] = [
  { key: 'home', href: '/' },
  { key: 'events', href: '/events' },
  { key: 'upcoming', href: '/upcoming' },
  { key: 'members', href: '/members', phase2: true },
  { key: 'memories', href: '/memories', phase2: true },
  { key: 'journey', href: '/journey' },
  { key: 'join', href: '/join' },
  { key: 'contact', href: '/contact' },
];

/** Footer link columns (Footer). */
export const FOOTER_NAV: {
  explore: readonly NavEntry<FooterNavKey>[];
  getInvolved: readonly NavEntry<FooterNavKey>[];
} = {
  explore: [
    { key: 'events', href: '/events' },
    { key: 'upcoming', href: '/upcoming' },
    { key: 'members', href: '/members', phase2: true },
    { key: 'memories', href: '/memories', phase2: true },
    { key: 'journey', href: '/journey' },
  ],
  getInvolved: [
    { key: 'join', href: '/join' },
    { key: 'submit', href: '/submit', phase2: true },
    { key: 'partners', href: '/partners' },
    { key: 'contact', href: '/contact' },
  ],
};

/** Drops Phase 2 entries while member accounts are off. */
export function visibleNav<K extends string>(
  items: readonly NavEntry<K>[],
  phase2: boolean,
): { key: K; href: string }[] {
  return items.filter((item) => phase2 || !item.phase2).map(({ key, href }) => ({ key, href }));
}

export const EESTEC_NET_URL = 'https://eestec.net';
