'use client';

import { CalendarPlus, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu';

export type CalendarLinks = { google: string; ics: string };

/**
 * "Add to calendar" (ApplyBox): Google Calendar opens in a new tab; Apple Calendar and Outlook
 * download the same .ics file.
 */
export function AddToCalendar({
  links,
  label,
  className,
  variant = 'menu',
}: {
  links: CalendarLinks;
  /** Button text; defaults to "Add to calendar". */
  label?: string;
  className?: string;
  /** menu: the grey ApplyBox button; secondary: the red outline button after applying. */
  variant?: 'menu' | 'secondary';
}) {
  const t = useTranslations('applications.calendar');
  const item = 'min-h-11 text-[15px] font-medium';
  return (
    // Not modal: a menu of links shouldn't hide the rest of the page from screen readers.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === 'menu' ? 'quiet' : 'secondary'}
          className={cn(variant === 'menu' && 'w-full border-line-input text-[16px]', className)}
        >
          <CalendarPlus className={cn(variant === 'menu' && 'text-brand')} aria-hidden />
          {label ?? t('button')}
          {variant === 'menu' && <ChevronDown className="size-4" aria-hidden />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-(--radix-dropdown-menu-trigger-width)">
        <DropdownMenuItem asChild className={item}>
          <a href={links.google} target="_blank" rel="noopener noreferrer">
            {t('google')}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={item}>
          <a href={links.ics} download>
            {t('apple')}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={item}>
          <a href={links.ics} download>
            {t('outlook')}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
