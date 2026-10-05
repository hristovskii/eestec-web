import 'server-only';

import { authRepository } from './data';
import type { AuthRepository } from './data/auth.repository';

// Admin accounts for the Admin users screen (features/admin-users). Callers check the permission.

export const listAdminAccounts = async () => (await authRepository()).listAdmins();

export const inviteAdminAccount = async (input: Parameters<AuthRepository['inviteAdmin']>[0]) =>
  (await authRepository()).inviteAdmin(input);

export const updateAdminAccount = async (...args: Parameters<AuthRepository['updateAdmin']>) =>
  (await authRepository()).updateAdmin(...args);

export const removeAdminAccount = async (userId: string) => (await authRepository()).removeAdmin(userId);

export const resendAdminInvite = async (userId: string, now: Date) =>
  (await authRepository()).resendInvite(userId, now);
