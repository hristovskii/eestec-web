'use server';

import { authRepository } from '../data';

export async function signOut(): Promise<void> {
  await (await authRepository()).signOut();
}
