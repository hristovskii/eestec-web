import type { AdminAccount, AdminRole } from '@/features/auth';

export type AdminChangeProblem = 'self' | 'lastSuperAdmin';

const otherSuperAdmins = (admins: readonly AdminAccount[], userId: string) =>
  admins.filter(
    (admin) => admin.role === 'super_admin' && admin.status === 'active' && admin.userId !== userId,
  );

/** Why `actorId` may not give `target` the role `next` (or remove it, next = null), or null. */
export function adminChangeProblem({
  actorId,
  target,
  next,
  admins,
}: {
  actorId: string;
  target: AdminAccount;
  next: AdminRole | null;
  admins: readonly AdminAccount[];
}): AdminChangeProblem | null {
  if (target.userId === actorId) return 'self';
  if (
    target.role === 'super_admin' &&
    next !== 'super_admin' &&
    otherSuperAdmins(admins, target.userId).length === 0
  )
    return 'lastSuperAdmin';
  return null;
}

export type LastActive =
  | { kind: 'now' }
  | { kind: 'today' | 'yesterday'; at: string }
  | { kind: 'recent' | 'older'; at: string }
  | { kind: 'never' };

const dayInSkopje = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Skopje', dateStyle: 'short' }).format(date);

/** "Now" (5 minutes), "Today, 16:02", "Yesterday, 18:02", "Fri 2 Oct, 16:40" (a week), else a date. */
export function lastActive(iso: string | null, now: Date): LastActive {
  if (!iso) return { kind: 'never' };
  const at = new Date(iso);
  const minutes = (now.getTime() - at.getTime()) / 60_000;
  if (minutes < 5) return { kind: 'now' };
  const yesterday = new Date(now.getTime() - 24 * 3_600_000);
  if (dayInSkopje(at) === dayInSkopje(now)) return { kind: 'today', at: iso };
  if (dayInSkopje(at) === dayInSkopje(yesterday)) return { kind: 'yesterday', at: iso };
  return { kind: minutes < 7 * 24 * 60 ? 'recent' : 'older', at: iso };
}
