'use client';

import { Check, Link2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

import { socialButtonClasses } from './social-button';

/** "Copy profile link": copies the address of this page, and says so for a moment (also to screen readers). */
export function CopyLinkButton({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  const t = useTranslations('members.profile');
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}`);
      setCopied(true);
    } catch {
      // No clipboard (an old browser, or no permission): the address is in the address bar.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={iconOnly ? t('copy') : undefined}
        className={cn(socialButtonClasses, iconOnly && 'w-11 justify-center px-0', className)}
      >
        {copied ? (
          <Check className="size-[18px]" aria-hidden />
        ) : (
          <Link2 className="size-[18px]" aria-hidden />
        )}
        {!iconOnly && t('copy')}
      </button>
      <span role="status" className="sr-only">
        {copied ? t('copied') : ''}
      </span>
    </>
  );
}
