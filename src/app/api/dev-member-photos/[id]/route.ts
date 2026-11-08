import { mockMemberPhotoResponse } from '@/features/auth/server';

// Profile photos chosen at sign-up (dev and preview only; see features/auth).
export async function GET(_request: Request, { params }: RouteContext<'/api/dev-member-photos/[id]'>) {
  return mockMemberPhotoResponse((await params).id);
}
