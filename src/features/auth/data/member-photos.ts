import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

// Profile photos chosen at sign-up, in memory (stands in for Supabase Storage): per server instance,
// gone after a restart. Served by /api/dev-member-photos/[id] for the approvals preview.

export type MemberPhoto = { mimeType: string; bytes: Uint8Array };

const table = () => mockTable<{ files: Record<string, MemberPhoto> }>('memberPhotos', () => ({ files: {} }));

export function saveMockMemberPhoto(photo: MemberPhoto): string {
  const id = crypto.randomUUID();
  table().files[id] = photo;
  return id;
}

export const readMockMemberPhoto = (id: string): MemberPhoto | null => table().files[id] ?? null;

export const photoUrl = (id: string) => `/api/dev-member-photos/${id}`;
