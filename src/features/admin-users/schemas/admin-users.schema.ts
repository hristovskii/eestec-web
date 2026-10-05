import { z } from 'zod';

// Messages are keys under admin.users.errors (the client translates them).

const role = z.enum(['super_admin', 'editor', 'event_manager']);
const eventIds = z.array(z.string().min(1)).max(50);

/** Event managers manage at least one event (AdminDialogs › Invite an admin). */
const eventsForRole = <T extends { role: z.infer<typeof role>; managedEventIds: string[] }>(value: T) =>
  value.role !== 'event_manager' || value.managedEventIds.length > 0;

export const inviteAdminSchema = z
  .object({
    name: z.string().trim().min(1, 'required').max(80, 'tooLong'),
    email: z.email('email'),
    role,
    managedEventIds: eventIds,
  })
  .refine(eventsForRole, { message: 'eventsRequired', path: ['managedEventIds'] });
export type InviteAdminInput = z.infer<typeof inviteAdminSchema>;

export const changeAdminSchema = z
  .object({ userId: z.string().min(1), role, managedEventIds: eventIds })
  .refine(eventsForRole, { message: 'eventsRequired', path: ['managedEventIds'] });

export const adminUserIdSchema = z.object({ userId: z.string().min(1) });
