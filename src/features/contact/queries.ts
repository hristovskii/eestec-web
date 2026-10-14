import 'server-only';

import { contactRepository } from './data';

/** Admin › Pages › Contact: everything in both languages; never cached. Callers check the permission. */
export async function getContactForEdit() {
  return { contact: await (await contactRepository('session')).get() };
}
