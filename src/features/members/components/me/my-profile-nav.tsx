'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

export type MyProfileNavItem = { id: string; label: string; count?: number };

/**
 * The sections of /profile (MyProfile › sticky menu): a column beside the cards on large screens, a
 * row of pills under the header on phones. The section being read is marked (the last whose top has
 * passed under the bars).
 */
export function MyProfileNav({ items }: { items: readonly MyProfileNavItem[] }) {
  const t = useTranslations('members.me.nav');
  const [active, setActive] = React.useState(items[0]?.id ?? '');
  const list = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    let frame = 0;
    const measure = () => {
      let current = items[0]?.id ?? '';
      for (const item of items) {
        const top = document.getElementById(item.id)?.getBoundingClientRect().top ?? Infinity;
        if (top <= 150) current = item.id;
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      setActive(atBottom ? (items.at(-1)?.id ?? current) : current);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [items]);

  // Phones: keep the marked pill in view inside the sideways-scrolling row.
  React.useEffect(() => {
    const container = list.current;
    const link = container?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!container || !link || container.scrollWidth <= container.clientWidth) return;
    container.scrollTo({ left: link.offsetLeft - container.clientWidth / 2 + link.offsetWidth / 2 });
  }, [active]);

  return (
    <nav
      ref={list}
      aria-label={t('label')}
      className="sticky top-16 z-[15] -mx-4 flex gap-1.5 overflow-x-auto border-b border-line bg-white px-4 py-2 sm:-mx-6 sm:px-6 lg:top-24 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:px-0"
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          aria-current={active === item.id ? 'true' : undefined}
          className={cn(
            'flex h-11 shrink-0 items-center justify-between gap-2.5 rounded-sm px-3.5 text-[15px] font-medium whitespace-nowrap text-ink no-underline hover:bg-white',
            'focus-visible:outline-3 focus-visible:outline-brand',
            'aria-[current=true]:bg-surface aria-[current=true]:font-bold aria-[current=true]:text-brand-dark',
            'lg:aria-[current=true]:bg-white lg:aria-[current=true]:shadow-[inset_3px_0_0_var(--color-brand)]',
          )}
        >
          {item.label}
          {item.count !== undefined && (
            <span className="inline-flex h-[22px] items-center rounded-full bg-surface px-2 text-[13px] font-medium lg:bg-surface">
              {item.count}
            </span>
          )}
        </a>
      ))}
    </nav>
  );
}
