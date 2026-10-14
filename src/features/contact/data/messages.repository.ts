import type { ContactMessage, ContactMessageInput, ContactStatus } from '../types';

/** Messages from /contact. The board's list (Inbox › Contact messages) reads it in M12d. */
export interface MessagesRepository {
  /** Stores a new message (status "new", unread, consent recorded at `now`) with the next reference of the year. */
  submit(input: ContactMessageInput, now: Date): Promise<ContactMessage>;
  /** Newest first, optionally one status. */
  list(query?: { status?: ContactStatus }): Promise<ContactMessage[]>;
  get(id: string): Promise<ContactMessage | null>;
  updateStatus(id: string, status: ContactStatus): Promise<ContactMessage | null>;
  /** Marks one message read (at `now`) or unread (null). */
  setRead(id: string, readAt: Date | null): Promise<ContactMessage | null>;
  /** "Mark all as read": every unread message gets `now`; returns how many changed. */
  markAllRead(now: Date): Promise<number>;
}
