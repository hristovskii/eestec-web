import { mockMailboxResponse } from '@/features/auth/server';

// The mock mailbox (dev and preview only; see features/auth).
export function GET(request: Request) {
  return mockMailboxResponse(new URL(request.url));
}
