import { memoryPhotoResponse } from '@/features/memories/server';

// Photos of Memories on mock data (dev and preview only; see features/memories).
export async function GET(_request: Request, { params }: RouteContext<'/api/dev-memory-photos/[id]'>) {
  return memoryPhotoResponse((await params).id);
}
