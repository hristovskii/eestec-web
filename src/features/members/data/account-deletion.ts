import type { DeleteAccountResult } from '@/features/auth';

export type AccountDeletionInput = {
  userId: string;
  /** Who they were, for the confirmation that goes to the old address. */
  name: string;
  email: string;
  locale: 'mk' | 'en';
  /** "Also delete my Memories" (default off): off keeps the published ones as "A former member". */
  alsoDeleteMemories: boolean;
};

/**
 * Deleting a member's account with everything tied to it: the profile, choices, CV and photo, the applications,
 * the Memories (those that are not published always; published ones only when asked) and last the account itself.
 * Board accounts are removed in Admin › Users & roles (`staff`). The caller has checked the password.
 *
 * On a database it is one durable job (`begin_member_deletion`: the rows go in one transaction and the files are
 * queued; then the files, the Auth user and the finish), so a deletion that was interrupted is finished by asking
 * again. On mock data it is the same steps through each part's own repository.
 */
export interface AccountDeletion {
  deleteAccount(input: AccountDeletionInput): Promise<DeleteAccountResult>;
}
