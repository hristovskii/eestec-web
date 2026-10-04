'use client';

import { Minus, Plus } from 'lucide-react';
import { Accordion as AccordionPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

// FAQ accordion (JoinPage): 18 px question, plus/minus pill (pink closed, red open).
const Accordion = AccordionPrimitive.Root;

function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('border-b border-line', className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header asChild>
      <h3>
        <AccordionPrimitive.Trigger
          data-slot="accordion-trigger"
          className={cn(
            'group flex min-h-16 w-full cursor-pointer items-center justify-between gap-4 px-1 py-4 text-left text-body font-medium text-ink sm:text-lg',
            'hover:text-brand-dark focus-visible:rounded-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand',
            className,
          )}
          {...props}
        >
          {children}
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-dark group-data-[state=open]:bg-brand group-data-[state=open]:text-white sm:size-8"
          >
            <Plus className="size-4 group-data-[state=open]:hidden" strokeWidth={2.6} />
            <Minus className="hidden size-4 group-data-[state=open]:block" strokeWidth={2.6} />
          </span>
        </AccordionPrimitive.Trigger>
      </h3>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div className={cn('px-1 pb-5 text-body text-ink-2', className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
