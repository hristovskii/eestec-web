'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog';

/**
 * "Share your memory": members go to the editor; everyone else gets the choice between logging in
 * and sending a quick impression (MemoryStates panel 5, decided rule). `href` is where a member
 * goes (the editor, with an event when this is on an event's page).
 */
export function ShareMemoryButton({
  member,
  href = '/memories/new',
  variant = 'primary',
  block,
  className,
}: {
  member: boolean;
  href?: string;
  variant?: 'primary' | 'secondary';
  block?: boolean;
  className?: string;
}) {
  const t = useTranslations('memories.share');
  const [open, setOpen] = React.useState(false);
  if (member)
    return (
      <Button asChild variant={variant} block={block} className={className}>
        <Link href={href}>{t('button')}</Link>
      </Button>
    );
  return (
    <>
      <Button
        type="button"
        variant={variant}
        block={block}
        className={className}
        onClick={() => setOpen(true)}
      >
        {t('button')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('guestTitle')}</DialogTitle>
            <DialogDescription className="text-small">{t('guestText')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2.5 sm:flex-col">
            <Button asChild block>
              <Link href={'/login?next=/memories/new'}>{t('guestLogin')}</Link>
            </Button>
            <Button asChild variant="secondary" block>
              <Link href={'/submit?tab=impression'}>{t('guestImpression')}</Link>
            </Button>
            <Button type="button" variant="ghost" block onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
