import * as React from 'react';

import { cn } from '@/shared/lib/cn';

import { fieldControlClasses } from './input';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldControlClasses, 'min-h-30 resize-y px-3.5 py-3 leading-normal', className)}
      {...props}
    />
  );
}

export { Textarea };
