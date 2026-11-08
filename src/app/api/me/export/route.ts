import { myDataResponse } from '@/features/members/server';
import { isEnabled } from '@/shared/config/flags';

// "Download my data" (/profile › Account): a ZIP of the signed-in member's own data.
export async function GET() {
  if (!isEnabled('phase2')) return new Response('Not found', { status: 404 });
  return myDataResponse();
}
