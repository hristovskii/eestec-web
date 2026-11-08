import * as React from 'react';

import { cn } from '@/shared/lib/cn';

/** One card of /profile (MyProfile › pcard): title, help, an optional link at the right, and the body. */
export function MeCard({
  id,
  title,
  help,
  aside,
  children,
  className,
  bodyClassName,
}: {
  id: string;
  title: React.ReactNode;
  help?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn('scroll-mt-36 rounded-lg border border-line bg-white lg:scroll-mt-28', className)}
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-6 sm:px-7">
        <div className="flex flex-col gap-1">
          <h2 id={`${id}-title`} className="text-[22px] leading-[1.3] font-bold">
            {title}
          </h2>
          {help && <p className="text-small text-muted-ink">{help}</p>}
        </div>
        {aside}
      </div>
      <div className={cn(bodyClassName ?? 'px-5 pt-5 pb-7 sm:px-7')}>{children}</div>
    </section>
  );
}
