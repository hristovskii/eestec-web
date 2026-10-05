'use client';

import { CircleCheck, CircleAlert, Info, LoaderCircle } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// Toasts (AdminEditStates, MyProfileStates): bottom-right, 5 s, pause on hover.
// Dark by default; errors are white with a red border and stay until closed (pass duration: Infinity).
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      duration={5000}
      icons={{
        success: <CircleCheck className="size-5 text-white" aria-hidden />,
        info: <Info className="size-5" aria-hidden />,
        warning: <CircleAlert className="size-5" aria-hidden />,
        error: <CircleAlert className="size-5 text-brand" aria-hidden />,
        loading: <LoaderCircle className="size-5 animate-spin" aria-hidden />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-[360px] max-w-[calc(100vw-32px)] items-start gap-3 rounded-md bg-ink px-[18px] py-3.5 text-small text-white shadow-card',
          title: 'font-medium',
          description: 'mt-0.5 opacity-85',
          actionButton:
            'ml-auto shrink-0 rounded-sm px-2 py-1 font-medium text-white underline underline-offset-2 hover:bg-white/15',
          cancelButton: 'ml-2 shrink-0 font-medium',
          error: 'border-2 border-brand bg-white text-ink [&_[data-button]]:text-brand-dark',
          closeButton: 'text-current',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
