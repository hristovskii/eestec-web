'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';
import { Container } from '@/shared/ui/container';
import { Button } from '@/shared/ui/primitives/button';

import type { JoinSection } from '../../types';

/**
 * The sticky menu under the header (JoinPage › subnav): jumps to each section and marks the one
 * being read (the last whose top has passed under the bars). On phones the links scroll sideways
 * and the marked one is kept in view. "Apply now" at the right only when the page has the form.
 */
export function JoinSubNav({ sections, hasForm }: { sections: readonly JoinSection[]; hasForm: boolean }) {
  const t = useTranslations('join.nav');
  const [active, setActive] = React.useState<JoinSection | null>(null);
  const list = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let frame = 0;
    const measure = () => {
      let current: JoinSection | null = null;
      for (const id of sections) {
        const top = document.getElementById(id)?.getBoundingClientRect().top ?? Infinity;
        if (top <= 170) current = id;
      }
      // At the very bottom the last section may be too short to reach the top.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      setActive(atBottom ? (sections.at(-1) ?? current) : current);
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
  }, [sections]);

  // Keep the marked link in view inside the sideways-scrolling menu (phones).
  React.useEffect(() => {
    const container = list.current;
    const link = container?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!container || !link || container.scrollWidth <= container.clientWidth) return;
    container.scrollTo({ left: link.offsetLeft - container.clientWidth / 2 + link.offsetWidth / 2 });
  }, [active]);

  return (
    <nav aria-label={t('label')} className="sticky top-16 z-[15] border-b border-line bg-white xl:top-18">
      <Container className="flex items-center gap-4 xl:gap-7">
        <div
          ref={list}
          className="-mx-4 flex min-w-0 flex-1 gap-5 overflow-x-auto px-4 sm:mx-0 sm:px-0 xl:gap-7"
        >
          {sections.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={active === id ? 'true' : undefined}
              className={cn(
                'flex h-13 shrink-0 items-center border-b-[3px] text-small font-medium whitespace-nowrap no-underline xl:h-14 xl:text-body',
                'focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-brand',
                active === id ? 'border-brand text-ink' : 'border-transparent text-muted-ink hover:text-ink',
              )}
            >
              {t(id)}
            </a>
          ))}
        </div>
        {hasForm && (
          <Button asChild size="sm" className="shrink-0">
            <a href="#apply">{t('applyNow')}</a>
          </Button>
        )}
      </Container>
    </nav>
  );
}
