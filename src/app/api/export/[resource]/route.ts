import { eventsCsvResponse } from '@/features/events/server';

// CSV downloads of admin lists (permission-checked by each feature). Applications follow in M7.
const EXPORTS: Record<string, (searchParams: URLSearchParams) => Promise<Response>> = {
  events: eventsCsvResponse,
};

export async function GET(request: Request, { params }: RouteContext<'/api/export/[resource]'>) {
  const exporter = EXPORTS[(await params).resource];
  if (!exporter) return new Response('Not found', { status: 404 });
  return exporter(new URL(request.url).searchParams);
}
