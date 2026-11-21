import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { anonClient, createTestUser, serviceClient } from '../../../../tests/supabase/harness';
import type { PartnerInquiryInput } from '../types';
import { describeInquiriesRepository } from './inquiries.repository.contract';
import type { InquiriesRepository } from './inquiries.repository';
import { createSupabaseInquiriesRepository } from './inquiries.supabase';

let editor: Awaited<ReturnType<typeof createTestUser>>;
let manager: Awaited<ReturnType<typeof createTestUser>>;
beforeAll(async () => {
  editor = await createTestUser({ role: 'editor' });
  manager = await createTestUser({ role: 'event_manager' });
});
afterAll(async () => {
  await editor.cleanup();
  await manager.cleanup();
});

/** As in the app: the form stores with the service scope, the board reads and changes with its own session. */
const asApp = (): InquiriesRepository => ({
  ...createSupabaseInquiriesRepository(editor.client()),
  submit: (input, now) => createSupabaseInquiriesRepository(serviceClient()).submit(input, now),
});

const input: PartnerInquiryInput = {
  company: 'Contract Test Ltd',
  contactPerson: 'Test Person',
  email: 'contract.test@example.org',
  phone: '',
  interests: ['workshop', 'other'],
  message: 'A message that is long enough for the contract test.',
  locale: 'en',
};

describeInquiriesRepository('supabase', asApp);

describe('InquiriesRepository (supabase, who may do what)', () => {
  it('numbers references by the year of the moment given, not of the database clock', async () => {
    const stored = await asApp().submit(input, new Date('2027-01-02T12:00:00.000Z'));
    expect(stored.reference).toMatch(/^PRT-2027-\d{4}$/);
    expect(stored.interests).toEqual(['workshop', 'other']);
  });

  it('is not open to visitors: they cannot store or read inquiries', async () => {
    const visitor = createSupabaseInquiriesRepository(anonClient());
    await expect(visitor.submit(input, new Date())).rejects.toMatchObject({ kind: 'forbidden' });
    await expect(visitor.list()).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('shows an event manager nothing and lets them change nothing', async () => {
    const stored = await asApp().submit(input, new Date());
    const asManager = createSupabaseInquiriesRepository(manager.client());
    expect(await asManager.list()).toEqual([]);
    expect(await asManager.get(stored.id)).toBeNull();
    await expect(asManager.updateStatus(stored.id, 'done')).rejects.toMatchObject({ kind: 'forbidden' });
    await expect(asManager.markAllRead(new Date())).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('refuses a status that does not exist', async () => {
    const stored = await asApp().submit(input, new Date());
    await expect(asApp().updateStatus(stored.id, 'bogus' as never)).rejects.toMatchObject({
      kind: 'invalid',
    });
  });

  it('keeps an inquiry whose address was erased (null)', async () => {
    const stored = await asApp().submit(input, new Date());
    await serviceClient().from('partner_inquiries').update({ email: null }).eq('id', stored.id);
    expect(await asApp().get(stored.id)).toMatchObject({ email: null, company: input.company });
  });
});
