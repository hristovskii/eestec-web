import * as React from 'react';

import { cn } from '@/shared/lib/cn';

type SectionTitleProps = {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  intro?: React.ReactNode;
  align?: 'left' | 'center';
  /** Heading level; the visual size is always H2. */
  as?: 'h1' | 'h2';
  id?: string;
  className?: string;
};

/** H2 + 56×4 red bar (Main › Section title). Centered variant for Partners and Journey. */
export function SectionTitle({
  title,
  eyebrow,
  intro,
  align = 'left',
  as = 'h2',
  id,
  className,
}: SectionTitleProps) {
  const Heading = as;
  return (
    <div className={cn('flex flex-col gap-3', align === 'center' && 'items-center text-center', className)}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <Heading id={id} className="type-h2">
        {title}
      </Heading>
      <TitleBar />
      {intro && <p className="max-w-[640px] text-body text-muted-ink">{intro}</p>}
    </div>
  );
}

export function TitleBar({ className }: { className?: string }) {
  return <span aria-hidden className={cn('block h-1 w-14 rounded-[2px] bg-brand', className)} />;
}
