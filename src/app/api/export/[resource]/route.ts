import { applicationCounts, applicationsCsvResponse } from '@/features/applications/server';
import { committeesCsvResponse } from '@/features/committees/server';
import { eventsCsvResponse } from '@/features/events/server';

// CSV downloads of admin lists (permission-checked by each feature).
const EXPORTS: Record<string, (searchParams: URLSearchParams) => Promise<Response>> = {
  events: (searchParams) => eventsCsvResponse(searchParams, applicationCounts),
  applications: applicationsCsvResponse,
  committees: committeesCsvResponse,
};

export async function GET(request: Request, { params }: RouteContext<'/api/export/[resource]'>) {
  const exporter = EXPORTS[(await params).resource];
  if (!exporter) return new Response('Not found', { status: 404 });
  return exporter(new URL(request.url).searchParams);
}
