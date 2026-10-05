'use client';

import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { EventOption } from '@/features/events';
import { cn } from '@/shared/lib/cn';
import { FieldError } from '@/shared/ui/form/form-field';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu';

/**
 * "Events they manage" (AdminDialogs › Invite an admin): picked events as red chips with ×, and a
 * dashed "+ Add event" chip that opens the list of the others.
 */
export function EventChips({
  id,
  label,
  options,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  options: EventOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  const t = useTranslations('admin.users.inviteDialog');
  const picked = value
    .map((eventId) => options.find((option) => option.id === eventId))
    .filter(Boolean) as EventOption[];
  const others = options.filter((option) => !value.includes(option.id));
  const chip =
    'inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      aria-describedby={error ? `${id}-error` : undefined}
      className="flex flex-col"
    >
      <span id={`${id}-label`} className="mb-1.5 text-small font-medium">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {picked.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onChange(value.filter((eventId) => eventId !== event.id))}
            aria-label={t('removeEvent', { event: event.title })}
            className={cn(
              chip,
              'border-2 border-brand bg-brand-tint px-[11px] text-brand-dark hover:bg-white',
            )}
          >
            {event.title}
            <X className="size-3.5" aria-hidden />
          </button>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              id={id}
              disabled={others.length === 0}
              className={cn(
                chip,
                'border border-dashed border-line-input text-muted-ink hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              <Plus className="size-3.5" aria-hidden />
              {others.length === 0 ? t('noMoreEvents') : t('addEvent')}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 min-w-72">
            {others.map((event) => (
              <DropdownMenuItem
                key={event.id}
                onSelect={() => onChange([...value, event.id])}
                className="min-h-9 text-small"
              >
                {event.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}
