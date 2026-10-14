import type { PartnerInquiry } from '../../types';

// SAMPLE DATA: three made-up inquiries (fictional companies, example.org addresses) so the board's
// list in Inbox › Partner inquiries has something to show. Replaced by the real ones from /partners.

export const inquiriesFixture: PartnerInquiry[] = [
  {
    id: 'pi-1',
    reference: 'PRT-2026-0014',
    company: 'Polaris Instruments',
    contactPerson: 'Nikola Petrov',
    email: 'nikola.petrov@example.org',
    phone: '+389 2 555 0101',
    interests: ['workshop'],
    message:
      'We would like to run a half-day workshop on measurement systems for third-year students in spring.',
    locale: 'en',
    consentAt: '2026-09-28T10:12:00+02:00',
    status: 'in_progress',
    readAt: '2026-09-28T11:00:00+02:00',
    createdAt: '2026-09-28T10:12:00+02:00',
  },
  {
    id: 'pi-2',
    reference: 'PRT-2026-0015',
    company: 'Hexacore',
    contactPerson: 'Elena Dimitrova',
    email: 'elena.dimitrova@example.org',
    phone: '',
    interests: ['sponsorship', 'job_fair'],
    message:
      'We are interested in the Gold package and a stand at the next job fair. Could you send the current offer?',
    locale: 'en',
    consentAt: '2026-10-01T14:40:00+02:00',
    status: 'new',
    readAt: null,
    createdAt: '2026-10-01T14:40:00+02:00',
  },
  {
    id: 'pi-3',
    reference: 'PRT-2026-0016',
    company: 'Нова Енергија ДООЕЛ',
    contactPerson: 'Марко Илиев',
    email: 'marko.iliev@example.org',
    phone: '',
    interests: ['other'],
    message: 'Сакаме да разговараме за пракса за студенти од електротехника во нашата компанија.',
    locale: 'mk',
    consentAt: '2026-10-03T09:05:00+02:00',
    status: 'new',
    readAt: null,
    createdAt: '2026-10-03T09:05:00+02:00',
  },
];
