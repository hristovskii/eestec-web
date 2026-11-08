import { describe, expect, it } from 'vitest';

import { submitProblems } from '../../domain/memory-fields';
import { memoriesFixture } from './memories';

describe('sample Memories', () => {
  it('have unique ids and addresses, and no reserved address', () => {
    const ids = memoriesFixture.map((record) => record.id);
    expect(new Set(ids).size).toBe(ids.length);
    const slugs = memoriesFixture.flatMap((record) => (record.slug ? [record.slug] : []));
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).not.toContain('new');
  });

  it('cover every status, with four waiting for the board (the dashboard says 4)', () => {
    const statuses = new Set(memoriesFixture.map((record) => record.status));
    expect([...statuses].sort()).toEqual(['draft', 'pending', 'published', 'rejected']);
    const waiting = memoriesFixture.filter(
      (record) => record.status === 'pending' || record.revision?.status === 'pending',
    );
    expect(waiting).toHaveLength(4);
  });

  it('published and waiting ones are complete; the rejected one lacks alt text; drafts have no address', () => {
    for (const record of memoriesFixture) {
      if (record.status === 'published' || record.status === 'pending')
        expect(submitProblems(record.content), record.id).toEqual([]);
      if (record.status === 'draft') expect(record.slug, record.id).toBeNull();
      if (record.status === 'published') expect(record.publishedAt, record.id).toBeTruthy();
    }
    const rejected = memoriesFixture.find((record) => record.status === 'rejected');
    expect(rejected?.rejectionReason).toBeTruthy();
    expect(submitProblems(rejected!.content).map((problem) => problem.field)).toContain('coverAlt');
  });

  it('has one Memory by a former member', () => {
    const former = memoriesFixture.filter((record) => record.authorDeleted);
    expect(former).toHaveLength(1);
    expect(former[0]?.authorId).toBeNull();
  });
});
