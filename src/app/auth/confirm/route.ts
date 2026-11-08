import { NextResponse } from 'next/server';

import { confirmEmailChangeLink, confirmEmailLink } from '@/features/auth/server';
import { isEnabled } from '@/shared/config/flags';

// The link in the confirmation e-mail (/auth/confirm?token=…, valid 24 hours): it activates the account,
// signs the person in and sends them to "waiting for board approval". A used, old or made-up link
// goes to "This link has expired". Outside the locale folders on purpose: the e-mail has one address.
export async function GET(request: Request) {
  if (!isEnabled('phase2')) return new NextResponse('Not found', { status: 404 });
  const params = new URL(request.url).searchParams;
  const token = params.get('token') ?? '';
  // `type=email`: the link of a new e-mail address (My profile › Account); no type: the sign-up link.
  const { path } =
    params.get('type') === 'email'
      ? await confirmEmailChangeLink(token, params.get('lang') ?? '')
      : await confirmEmailLink(token);
  return NextResponse.redirect(new URL(path, request.url));
}
