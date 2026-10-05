'use server';

import { sessionRepository } from '../data';

export async function signOut(): Promise<void> {
  await (await sessionRepository()).signOut();
}
