import 'server-only';

import { authorize } from '@/features/auth/server';
import { env } from '@/shared/config/env';

import { readMockFile, receiveMockUpload } from './data/mock-storage';

// /api/dev-uploads/[id]: the mock stand-in for Storage (PUT the file, GET it back). Only with
// mock data, never on a production deployment (same rule as the mock sign-in, D19).
const available = () => env.DATA_SOURCE === 'mock' && env.VERCEL_ENV !== 'production';

export async function putMockUpload(request: Request, uploadId: string): Promise<Response> {
  if (!available()) return new Response(null, { status: 404 });
  const session = await authorize('create', 'media');
  if (!session) return new Response(null, { status: 403 });
  const mimeType = request.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
  const bytes = new Uint8Array(await request.arrayBuffer());
  const result = receiveMockUpload(uploadId, { userId: session.userId, mimeType, bytes });
  const status = { ok: 204, not_found: 404, forbidden: 403, mismatch: 422 }[result];
  return new Response(null, { status });
}

export function getMockUpload(uploadId: string): Response {
  const file = available() ? readMockFile(uploadId) : null;
  if (!file) return new Response(null, { status: 404 });
  return new Response(file.bytes.slice().buffer, {
    headers: {
      'Content-Type': file.mimeType,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      // Uploaded SVGs and PDFs are opened as files, never as pages that can run scripts.
      'Content-Security-Policy':
        "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    },
  });
}
