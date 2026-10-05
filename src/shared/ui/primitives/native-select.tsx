import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

import { fieldControlClasses } from './input';

// Native <select> styled like an input (accessible and mobile-friendly; used for filters and forms).
function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className={cn('relative w-full', className)} data-slot="native-select-wrapper">
      <select
        data-slot="native-select"
        className={cn(
          fieldControlClasses,
          'h-[var(--control-h,48px)] cursor-pointer appearance-none pr-10 pl-3.5',
        )}
        {...props}
      />
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3.5 size-[18px] -translate-y-1/2 text-ink"
        aria-hidden
      />
    </div>
  );
}

function NativeSelectOption(props: React.ComponentProps<'option'>) {
  return <option data-slot="native-select-option" {...props} />;
}

export { NativeSelect, NativeSelectOption };
