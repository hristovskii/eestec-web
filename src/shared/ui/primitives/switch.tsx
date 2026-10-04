'use client';

import { Switch as SwitchPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

// Public switch 44×26 (SubmitForm); admin switch 36×20 (size="sm").
function Switch({
  className,
  size = 'md',
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & { size?: 'sm' | 'md' }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors',
        'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand',
        'data-[state=checked]:bg-brand data-[state=unchecked]:bg-line-input',
        'data-[size=md]:h-[26px] data-[size=md]:w-11 data-[size=sm]:h-5 data-[size=sm]:w-9',
        'data-[size=sm]:data-[state=unchecked]:bg-line-strong',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block translate-x-[3px] rounded-full bg-white shadow-sm transition-transform',
          'group-data-[size=md]/switch:size-5 group-data-[size=md]/switch:data-[state=checked]:translate-x-[21px]',
          'group-data-[size=sm]/switch:size-4 group-data-[size=sm]/switch:translate-x-0.5 group-data-[size=sm]/switch:data-[state=checked]:translate-x-[18px]',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
