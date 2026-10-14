/**
 * Pages that need member accounts (Phase 2). Phase 1 hides everything that leads there, so a step
 * button to one of them stays out of the public site until Phase 2 is on.
 */
const MEMBER_PATH = /^\/(members|memories|submit)(?:[/?#]|$)/;

export const isMemberPath = (href: string) => MEMBER_PATH.test(href);

/** The button as the public site shows it: null while its page does not exist yet. */
export function publicButton<T extends { href: string }>(button: T, phase2: boolean): T | null {
  return !phase2 && isMemberPath(button.href) ? null : button;
}
