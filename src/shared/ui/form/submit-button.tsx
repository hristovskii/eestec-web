import { LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Button, type ButtonProps } from '../primitives/button';

/** Primary submit (52 px). While sending: dark red, spinner, "Sending…", aria-busy. */
export function SubmitButton({ sending, children, ...props }: ButtonProps & { sending?: boolean }) {
  const t = useTranslations('ui.form');
  return (
    <Button
      type="submit"
      size="xl"
      aria-busy={sending || undefined}
      disabled={sending || props.disabled}
      className={
        sending ? 'disabled:border-brand-dark disabled:bg-brand-dark disabled:text-white' : undefined
      }
      {...props}
    >
      {sending ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden />
          {t('sending')}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/** Invisible honeypot (spam protection on every public form). Bots fill it; people never see it. */
export function Honeypot({ name = 'website' }: { name?: string }) {
  const t = useTranslations('ui.form');
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor={`hp-${name}`}>{t('honeypot')}</label>
      <input id={`hp-${name}`} name={name} type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}
