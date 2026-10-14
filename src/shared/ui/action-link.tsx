import type * as React from 'react';

import { Link } from '@/shared/i18n/navigation';

/** A board-written link: a page of this site (language-aware) or an https address (new tab). */
export function ActionLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (href.startsWith('/'))
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
