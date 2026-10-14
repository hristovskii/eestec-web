'use client';

import { Check, Copy } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

const COPIED_FOR_MS = 2000;

type CopyButtonProps = {
  /** What goes to the clipboard. */
  value: string;
  /** Name of the button: "Copy e-mail address". */
  label: string;
  /** Said and shown for a moment after copying: "Copied". */
  copiedLabel: string;
  className?: string;
};

/**
 * Copies a value (CopyButton: e-mail, registration number, bank account). The result is announced
 * to screen readers in a polite live region and shown as a check mark, because a toast would not
 * be seen by everyone. Where the clipboard is not available nothing is announced.
 */
export function CopyButton({ value, label, copiedLabel, className }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_FOR_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // No clipboard (an old browser, or no permission): the text is still on the page to select.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={label}
        className={cn(
          'flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-line bg-white text-muted-ink transition-colors hover:border-brand hover:text-brand-dark focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand',
          copied && 'border-brand text-brand-dark',
          className,
        )}
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      </button>
      <span role="status" className="sr-only">
        {copied ? copiedLabel : ''}
      </span>
    </>
  );
}
