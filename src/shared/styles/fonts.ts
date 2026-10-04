import { Roboto } from 'next/font/google';

// Self-hosted at build time (no runtime request to Google). Cyrillic is required for Macedonian.
export const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  display: 'swap',
  variable: '--font-roboto',
});
