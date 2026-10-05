import * as React from 'react';

import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';

type LinkTab = { href: string; label: React.ReactNode; count?: number; current: boolean };

/** URL tabs with counts (EventsList: Local / International). Plain links: they work without JS. */
export function LinkTabs({ tabs, label }: { tabs: LinkTab[]; label: string }) {
  return (
    <nav aria-label={label} className="border-b border-line">
      <ul className="-mb-px flex gap-6 overflow-x-auto">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              scroll={false}
              aria-current={tab.current ? 'page' : undefined}
              className={cn(
                'flex h-14 items-center gap-2.5 border-b-3 px-1 text-[17px] whitespace-nowrap no-underline',
                'focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-brand',
                tab.current
                  ? 'border-brand font-bold text-brand-dark'
                  : 'border-transparent font-medium text-muted-ink hover:text-ink',
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="inline-flex h-[22px] min-w-7 items-center justify-center rounded-full bg-surface px-2 text-[13px] font-medium text-ink">
                  {tab.count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
