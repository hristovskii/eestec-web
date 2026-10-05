import type { Session } from '../types';

/** The signed-in user. Supabase Auth in the backend phase (one login for members and admins). */
export interface SessionRepository {
  getSession(): Promise<Session | null>;
  signOut(): Promise<void>;
}
