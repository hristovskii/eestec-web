import { meetingIcsResponse } from '@/features/join/server';
import { routing } from '@/shared/i18n/routing';

// "Add to calendar" › Apple Calendar / Outlook after applying: the next weekly meeting as an .ics
// file (a segment without a dot, so the Macedonian URLs work: docs/ARCHITECTURE.md §1.3).
export async function GET(_request: Request, { params }: RouteContext<'/[locale]/join/calendar'>) {
  const { locale } = await params;
  const known = (routing.locales as readonly string[]).includes(locale)
    ? (locale as 'mk' | 'en')
    : routing.defaultLocale;
  return meetingIcsResponse(known);
}
