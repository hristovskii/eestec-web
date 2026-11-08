import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/shared/i18n/navigation';
import { buttonVariants } from '@/shared/ui/primitives/button';

import { AuthCard, AuthTitle } from './auth-shell';
import { AuthSteps } from './auth-steps';

/** "E-mail confirmed. Waiting for board approval." (AuthForm › pending): where a new member lands. */
export function PendingCard({ firstName, since }: { firstName: string; since: string }) {
  const t = useTranslations('auth.pending');
  return (
    <AuthCard>
      <span className="flex size-16 items-center justify-center rounded-full bg-ink text-white">
        <Clock className="size-7" aria-hidden />
      </span>
      <div role="status" className="flex flex-col gap-2">
        <AuthTitle>{t('title')}</AuthTitle>
        <p className="text-body text-muted-ink">{t('text', { name: firstName })}</p>
      </div>
      <AuthSteps
        steps={[
          { label: t('created'), state: 'done' },
          { label: t('confirmed'), state: 'done' },
          { label: t('approval'), hint: t('since', { when: since }), state: 'current' },
        ]}
      />
      <p className="rounded-md bg-surface px-4 py-3.5 text-small leading-normal">
        {t.rich('meanwhile', { strong: (chunks) => <strong>{chunks}</strong> })}
      </p>
      <Link href="/profile" className={buttonVariants({ size: 'lg' })}>
        {t('finish')}
      </Link>
    </AuthCard>
  );
}
