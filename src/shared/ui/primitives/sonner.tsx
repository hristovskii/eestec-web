'use client';

import { Check, CircleAlert, Info, LoaderCircle } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

import { cn } from '@/shared/lib/cn';

/**
 * Round check of a success toast: white on dark ("Saved as draft"); `live` is red for changes
 * that are now public ("Published. It's live on eestec.mk."): toast.success(msg, { icon: <ToastCheck live /> }).
 */
export function ToastCheck({ live = false }: { live?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full',
        live ? 'bg-brand text-white' : 'bg-white text-ink',
      )}
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  );
}

// Toasts (AdminEditStates, MyProfileStates): bottom-right, 5 s, pause on hover.
// Dark by default; errors are white with a red border and stay until closed (pass duration: Infinity).
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      duration={5000}
      icons={{
        success: <ToastCheck />,
        info: <Info className="size-5" aria-hidden />,
        warning: <CircleAlert className="size-5" aria-hidden />,
        error: <CircleAlert className="size-[22px] text-brand-dark" aria-hidden />,
        loading: <LoaderCircle className="size-5 animate-spin" aria-hidden />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-[400px] max-w-[calc(100vw-32px)] items-center gap-3 rounded-md bg-ink px-4 py-3.5 text-small text-white shadow-menu',
          icon: 'flex shrink-0',
          content: 'flex min-w-0 flex-1 flex-col',
          title: 'font-medium',
          description: 'mt-0.5 text-[13px] opacity-85',
          actionButton:
            'ml-auto shrink-0 cursor-pointer rounded-sm px-2 py-1 font-bold text-white underline underline-offset-2 hover:bg-white/15',
          cancelButton: 'ml-2 shrink-0 font-medium',
          // Sonner adds these next to the toast classes, so the colours need ! to beat bg-ink / text-white.
          error: cn(
            'border-2 border-brand bg-white! text-ink! [&_[data-description]]:text-muted-ink [&_[data-description]]:opacity-100 [&_[data-title]]:font-bold',
            // The action of an error ("Retry") is a quiet button, not a link.
            '[&_[data-button]]:h-8 [&_[data-button]]:border [&_[data-button]]:border-line-strong [&_[data-button]]:px-3 [&_[data-button]]:font-medium [&_[data-button]]:text-ink [&_[data-button]]:no-underline [&_[data-button]]:hover:border-ink [&_[data-button]]:hover:bg-white',
          ),
          closeButton: 'text-current',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
