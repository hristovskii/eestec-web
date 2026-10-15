import { Roboto } from 'next/font/google';

// Self-hosted at build time (no runtime request to Google). Cyrillic is required for Macedonian.
// The variable font: one file per script covers every weight (300–700), so a page asks for fewer
// files than with four static weights.
export const roboto = Roboto({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  display: 'swap',
  preload: false,
  variable: '--font-roboto',
});
