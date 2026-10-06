import { applicationFileResponse } from '@/features/applications/server';

// CVs sent with applications: private, admins with access to the event only (signed links in Storage later).
export async function GET(_request: Request, { params }: RouteContext<'/api/applications/files/[fileId]'>) {
  return applicationFileResponse((await params).fileId);
}
