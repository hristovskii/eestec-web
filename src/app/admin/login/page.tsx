import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { isStaff } from '@/features/auth';
import { AdminLogin } from '@/features/auth/admin';
import { adminSignInAvailable, getSession } from '@/features/auth/server';
import { getSiteSettings } from '@/features/settings/server';

export const metadata: Metadata = { title: 'Sign in' };

async function LoginGate() {
  const [session, settings] = await Promise.all([getSession(), getSiteSettings('en')]);
  if (session && isStaff(session)) redirect('/admin');
  return <AdminLogin year={settings.currentYear} available={adminSignInAvailable()} />;
}

// Reads the session cookie (dynamic), so it renders inside Suspense.
export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <LoginGate />
    </Suspense>
  );
}
