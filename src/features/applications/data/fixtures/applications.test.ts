import { describe, expect, it } from 'vitest';

import { applicationsFixture } from './applications';

// The sample applications must match the counts on the canvas (events: ev-<slug> of the events fixture).
describe('applications fixture', () => {
  const count = (eventId: string, status?: string) =>
    applicationsFixture.filter((row) => row.eventId === eventId && (!status || row.status === status)).length;

  it('matches the canvas counts', () => {
    expect(count('ev-ai-at-the-edge')).toBe(38);
    expect(count('ev-leading-teams')).toBe(23);
    expect(count('ev-fpga-basics', 'accepted')).toBe(20);
    expect(count('ev-fpga-basics', 'waitlist')).toBe(7);
    // AdminDashboard: "88 applications for open events, across 3 events".
    expect(count('ev-ai-at-the-edge') + count('ev-leading-teams') + count('ev-fpga-basics')).toBe(88);
  });

  it('has 10 new applications, as on the dashboard', () => {
    expect(applicationsFixture.filter((row) => !row.readAt).length).toBe(10);
  });

  it('has unique ids and references', () => {
    expect(new Set(applicationsFixture.map((row) => row.id)).size).toBe(applicationsFixture.length);
    expect(new Set(applicationsFixture.map((row) => row.reference)).size).toBe(applicationsFixture.length);
  });
});
