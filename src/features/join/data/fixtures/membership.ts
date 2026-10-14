import type { MembershipApplication } from '../../types';

// SAMPLE DATA (docs/sample-data.md): a few applications for the Inbox › Membership tab.
// The names and addresses are made up; example.org addresses never reach a real person.

const base = { locale: 'en', yearOfStudy: '2', faculty: 'FEEIT', phone: '' } as const;

export const membershipFixture: MembershipApplication[] = [
  {
    ...base,
    id: 'ma-sample-1',
    name: 'Sample Applicant One',
    email: 'sample.one@example.org',
    studyProgram: 'Computer Hardware Engineering and Electronics',
    interests: ['IT', 'Events'],
    heardFrom: 'Instagram',
    status: 'new',
    readAt: null,
    consentAt: '2026-10-03T12:20:00+02:00',
    createdAt: '2026-10-03T12:20:00+02:00',
  },
  {
    ...base,
    id: 'ma-sample-2',
    name: 'Sample Applicant Two',
    email: 'sample.two@example.org',
    yearOfStudy: '1',
    studyProgram: 'Software Engineering',
    interests: ['PR', 'Design'],
    heardFrom: 'A friend',
    status: 'contacted',
    readAt: '2026-10-01T11:30:00+02:00',
    consentAt: '2026-10-01T09:05:00+02:00',
    createdAt: '2026-10-01T09:05:00+02:00',
  },
  {
    ...base,
    id: 'ma-sample-3',
    name: 'Sample Applicant Three',
    email: 'sample.three@example.org',
    yearOfStudy: 'master',
    faculty: 'Other faculty at UKIM',
    studyProgram: 'Power Systems',
    interests: [],
    heardFrom: 'Info stand at FEEIT',
    status: 'accepted',
    readAt: '2026-09-23T09:00:00+02:00',
    consentAt: '2026-09-22T16:40:00+02:00',
    createdAt: '2026-09-22T16:40:00+02:00',
  },
];
