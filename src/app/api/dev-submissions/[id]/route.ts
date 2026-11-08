import { submissionFileResponse } from '@/features/ideas/server';

// Files of ideas and feedback on mock data (dev and preview only, board only; see features/ideas).
export async function GET(_request: Request, { params }: RouteContext<'/api/dev-submissions/[id]'>) {
  return submissionFileResponse((await params).id);
}
