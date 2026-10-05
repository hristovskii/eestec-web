'use client';

import { OTPInput, OTPInputContext } from 'input-otp';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

// 6-digit 2-step code (AdminLoginStates): separate boxes, red ring on the active one.
function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & { containerClassName?: string }) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn('flex items-center has-disabled:opacity-50', containerClassName)}
      spellCheck={false}
      className={cn('disabled:cursor-not-allowed', className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="input-otp-group" className={cn('flex items-center gap-2', className)} {...props} />;
}

function InputOTPSlot({ index, className, ...props }: React.ComponentProps<'div'> & { index: number }) {
  const context = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = context?.slots[index] ?? {};
  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        'relative flex h-14 w-11 items-center justify-center rounded-sm border border-line-input bg-white text-[24px] text-ink transition-[border-color,box-shadow]',
        'data-[active=true]:border-brand data-[active=true]:shadow-[var(--focus-ring)]',
        'aria-invalid:border-2 aria-invalid:border-brand',
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-px animate-caret-blink bg-ink duration-1000" />
        </div>
      )}
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot };
