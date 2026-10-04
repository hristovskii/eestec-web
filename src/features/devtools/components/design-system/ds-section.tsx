import * as React from 'react';

import { cn } from '@/shared/lib/cn';
import { TitleBar } from '@/shared/ui/section-title';

// Dev-only showcase (English, not translated): mirrors handoff/design-source/Main.dc.html.
export function DsSection({
  id,
  title,
  intro,
  frames,
  children,
  className,
}: {
  id: string;
  title: string;
  intro?: React.ReactNode;
  /** Canvas frames to compare with (handoff/screens). */
  frames?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn('flex scroll-mt-6 flex-col gap-8 border-t border-line py-18', className)}
    >
      <div className="flex flex-col gap-3">
        <h2 id={`${id}-title`} className="type-h2">
          {title}
        </h2>
        <TitleBar />
        {intro && <p className="max-w-[680px] text-body text-muted-ink">{intro}</p>}
        {frames && <p className="text-small text-muted-ink">Compare with: {frames}</p>}
      </div>
      {children}
    </section>
  );
}

export function DsLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[13px] font-medium tracking-[0.04em] text-muted-ink uppercase">{children}</span>
  );
}
