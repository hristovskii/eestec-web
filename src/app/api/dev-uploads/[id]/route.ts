import { getMockUpload, putMockUpload } from '@/features/media/server';

// Mock file storage for the Media library (dev and preview only; see features/media).
export async function PUT(request: Request, { params }: RouteContext<'/api/dev-uploads/[id]'>) {
  return putMockUpload(request, (await params).id);
}

export async function GET(_request: Request, { params }: RouteContext<'/api/dev-uploads/[id]'>) {
  return getMockUpload((await params).id);
}
