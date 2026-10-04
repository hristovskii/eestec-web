'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog as SheetPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

// Bottom sheet (EventsList-Mobile-Filters, radius 16 16 0 0) and side drawer (admin menu, 300 px).
const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

const sideClasses = {
  bottom:
    'inset-x-0 bottom-0 max-h-[90dvh] rounded-t-lg data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
  left: 'inset-y-0 left-0 h-full w-[300px] max-w-[85vw] data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
  right:
    'inset-y-0 right-0 h-full w-[440px] max-w-[90vw] data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
} as const;

function SheetContent({
  className,
  children,
  side = 'bottom',
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: keyof typeof sideClasses;
  showCloseButton?: boolean;
}) {
  const t = useTranslations('ui');
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/55 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'fixed z-50 flex flex-col overflow-y-auto bg-white text-ink shadow-card outline-none',
          'data-[state=closed]:animate-out data-[state=open]:animate-in',
          sideClasses[side],
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-sm hover:bg-surface focus-visible:outline-3 focus-visible:outline-brand"
            aria-label={t('close')}
          >
            <X className="size-5" aria-hidden />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="sheet-header" className={cn('flex flex-col gap-1 p-5 pr-16', className)} {...props} />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex gap-3 border-t border-divider p-4', className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn('text-h3-m font-bold', className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn('text-small text-muted-ink', className)} {...props} />;
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
