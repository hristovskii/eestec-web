import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// tailwind-merge must know our custom theme scales (src/shared/styles/globals.css). Without this it
// treats `text-body` (a font size) and `text-white` (a colour) as conflicts and drops one of them.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['h1', 'h1-m', 'h2', 'h2-m', 'h3', 'h3-m', 'body', 'small'],
      color: [
        'brand',
        'brand-dark',
        'brand-tint',
        'ink',
        'ink-2',
        'muted-ink',
        'line-input',
        'line-strong',
        'line',
        'divider',
        'surface',
        'surface-2',
      ],
      shadow: ['card', 'card-hover', 'menu', 'form', 'badge'],
    },
    classGroups: {
      'font-size': ['type-h1', 'type-h2', 'type-h3', 'eyebrow'],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
