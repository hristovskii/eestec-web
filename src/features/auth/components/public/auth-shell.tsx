import * as React from 'react';

import { cn } from '@/shared/lib/cn';
import { Container } from '@/shared/ui/container';
import { FormCard } from '@/shared/ui/form/form-field';

/** The grey page behind an auth card (AuthPage): the card sits in the middle, 480 px (760 px for sign-up). */
export function AuthShell({ wide, children }: { wide?: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-surface">
      <Container className="flex justify-center pt-5 pb-10 lg:px-6 lg:pt-16 lg:pb-24">
        <div className={cn('w-full', wide ? 'max-w-190' : 'max-w-120')}>{children}</div>
      </Container>
    </div>
  );
}

/** The white card of the auth screens (AuthForm): 36 px padding, 20 px on phones. */
export function AuthCard({ className, ...props }: React.ComponentProps<'div'>) {
  return <FormCard className={cn('flex flex-col gap-5.5', className)} {...props} />;
}

/** What shows while the page reads the session. */
export function AuthCardSkeleton() {
  return (
    <AuthCard aria-hidden>
      <div className="h-8 w-40 rounded-xs bg-surface" />
      <div className="h-12 rounded-sm bg-surface" />
      <div className="h-12 rounded-sm bg-surface" />
      <div className="h-13 rounded-sm bg-surface" />
    </AuthCard>
  );
}

export function AuthHeading({ title, lead }: { title: string; lead?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-[26px] leading-[1.2] font-bold lg:text-[30px]">{title}</h1>
      {lead && <p className="text-[15px] leading-normal text-muted-ink">{lead}</p>}
    </div>
  );
}
