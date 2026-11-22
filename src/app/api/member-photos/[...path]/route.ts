import { memberPhotoResponse } from '@/features/members/server';

// Private profile photos (see features/members/photo-response.ts).
export async function GET(_request: Request, { params }: RouteContext<'/api/member-photos/[...path]'>) {
  return memberPhotoResponse((await params).path);
}
