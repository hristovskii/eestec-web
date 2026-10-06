import { Search, SearchX } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

type EmptyStateProps = {
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  /** Active filters as RemovableTags. */
  tags?: React.ReactNode;
  actions?: React.ReactNode;
  /**
   * compact: dashed grey box (Main › Cards); page: centred white panel on list pages;
   * admin: centred inside an admin table panel, calmer grey icon (AdminEvents-Empty);
   * list: dashed box with a grey icon under a list's filters (EventsList-Empty).
   */
  variant?: 'compact' | 'page' | 'admin' | 'list';
  className?: string;
};

/** Every list has a designed empty state (decided rule). */
export function EmptyState({
  title,
  children,
  icon,
  tags,
  actions,
  variant = 'page',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        variant === 'compact' &&
          'items-start rounded-md border border-dashed border-line-strong bg-surface px-6 py-7',
        variant === 'page' &&
          'items-center rounded-lg border border-line bg-white px-6 py-12 text-center sm:py-16',
        variant === 'admin' && 'items-center px-6 py-14 text-center md:py-18',
        variant === 'list' &&
          'items-center gap-3.5 rounded-lg border border-dashed border-line-strong px-5 py-10 text-center sm:gap-4 sm:px-8 sm:py-18',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          variant !== 'admin' && variant !== 'list' && 'text-brand',
          variant === 'list' &&
            'flex size-16 items-center justify-center rounded-full bg-surface text-muted-ink sm:size-18 [&_svg]:size-7 sm:[&_svg]:size-8',
          variant === 'page' && 'mb-1 flex size-16 items-center justify-center rounded-full bg-brand-tint',
          variant === 'admin' &&
            'flex size-14 items-center justify-center rounded-full bg-surface text-muted-ink [&_svg]:size-6.5',
        )}
      >
        {icon ?? (variant === 'admin' ? <Search /> : <SearchX className="size-7" />)}
      </span>
      {tags && <div className="flex flex-wrap justify-center gap-2">{tags}</div>}
      {title && (
        <h2
          className={
            variant === 'admin'
              ? 'text-[16px] font-bold'
              : variant === 'list'
                ? 'text-[20px] font-bold sm:text-h3'
                : 'type-h3'
          }
        >
          {title}
        </h2>
      )}
      {children && (
        <div
          className={cn(
            variant === 'admin' ? 'max-w-[420px] text-small text-muted-ink' : 'text-body',
            variant === 'page' && 'max-w-[560px] text-muted-ink',
            variant === 'list' && 'max-w-[520px] text-muted-ink max-sm:text-small',
          )}
        >
          {children}
        </div>
      )}
      {actions && (
        <div
          className={cn('flex flex-wrap justify-center', variant === 'admin' ? 'gap-2 pt-1.5' : 'mt-2 gap-3')}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
