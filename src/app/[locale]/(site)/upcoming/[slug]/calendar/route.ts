import { icsResponse } from '@/features/applications/server';
import { routing } from '@/shared/i18n/routing';

// "Add to calendar" › Apple Calendar / Outlook: <slug>.ics (no dot in the segment name, so the
// Macedonian URLs work: docs/ARCHITECTURE.md §1.3).
export async function GET(_request: Request, { params }: RouteContext<'/[locale]/upcoming/[slug]/calendar'>) {
  const { locale, slug } = await params;
  const known = (routing.locales as readonly string[]).includes(locale)
    ? (locale as 'mk' | 'en')
    : routing.defaultLocale;
  return icsResponse(slug, known);
}
