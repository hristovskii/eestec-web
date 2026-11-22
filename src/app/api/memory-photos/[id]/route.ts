import { memoryPhotoResponse } from '@/features/memories/server';

// Photos of Memories: the file behind a fileId, for whoever may see it (see features/memories).
export async function GET(_request: Request, { params }: RouteContext<'/api/memory-photos/[id]'>) {
  return memoryPhotoResponse((await params).id);
}
