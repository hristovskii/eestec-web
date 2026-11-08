import { NextResponse } from 'next/server';

import { confirmEmailLink } from '@/features/auth/server';
import { isEnabled } from '@/shared/config/flags';

// The link in the confirmation e-mail (/auth/confirm?token=…, valid 24 hours): it activates the account,
// signs the person in and sends them to "waiting for board approval". A used, old or made-up link
// goes to "This link has expired". Outside the locale folders on purpose: the e-mail has one address.
export async function GET(request: Request) {
  if (!isEnabled('phase2')) return new NextResponse('Not found', { status: 404 });
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const { path } = await confirmEmailLink(token);
  return NextResponse.redirect(new URL(path, request.url));
}
