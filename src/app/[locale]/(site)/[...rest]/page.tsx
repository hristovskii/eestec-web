import { notFound } from 'next/navigation';

// Unknown paths under a locale render (site)/not-found.tsx, inside the site header and footer.
export default function CatchAll() {
  notFound();
}
