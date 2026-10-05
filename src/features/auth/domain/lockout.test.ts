import { describe, expect, it } from 'vitest';

import { emptyLog, lockState, recordFailure } from './lockout';

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 4, 16, minutes));

describe('sign-in lockout (5 failures → 15 minutes)', () => {
  it('counts down the attempts left', () => {
    let log = emptyLog();
    expect(lockState(log, at(0)).attemptsLeft).toBe(5);
    log = recordFailure(log, at(0));
    log = recordFailure(log, at(1));
    log = recordFailure(log, at(2));
    expect(lockState(log, at(2))).toEqual({ locked: false, until: null, attemptsLeft: 2 });
  });

  it('locks on the fifth failure for 15 minutes', () => {
    let log = emptyLog();
    for (let i = 0; i < 5; i++) log = recordFailure(log, at(i));
    expect(lockState(log, at(4))).toEqual({ locked: true, until: at(19), attemptsLeft: 0 });
    expect(lockState(log, at(18)).locked).toBe(true);
    expect(lockState(log, at(19))).toEqual({ locked: false, until: null, attemptsLeft: 5 });
  });

  it('forgets failures older than the window', () => {
    let log = emptyLog();
    for (let i = 0; i < 4; i++) log = recordFailure(log, at(i));
    expect(lockState(log, at(30)).attemptsLeft).toBe(5);
  });
});
