'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { Link, useRouter } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';

import { setMyVisibility } from '../../actions/my-profile';
import type { ProfileVisibility } from '../../types';

const OPTIONS = ['public', 'members_only'] as const;

/** "Who can see my profile" (MyProfile): two cards, saved as soon as one is picked. */
export function VisibilityCard({
  value,
  username,
  pending,
}: {
  value: ProfileVisibility;
  username: string;
  pending: boolean;
}) {
  const t = useTranslations('members.me.visibility');
  const router = useRouter();
  const [chosen, setChosen] = React.useState(value);
  const [seen, setSeen] = React.useState(value);
  if (value !== seen) {
    setSeen(value);
    setChosen(value);
  }

  async function choose(next: ProfileVisibility) {
    if (next === chosen) return;
    const before = chosen;
    setChosen(next);
    try {
      const result = await setMyVisibility(next);
      if (!result.ok) throw new Error(result.error);
      toast.success(t('saved'));
      router.refresh();
    } catch {
      setChosen(before);
      toast.error(t('failed'), { duration: Infinity });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="min-w-0" disabled={pending}>
        <legend className="sr-only">{t('legend')}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((option) => {
            const on = chosen === option;
            const key = option === 'public' ? 'public' : 'members';
            return (
              <label
                key={option}
                className={cn(
                  'grid cursor-pointer grid-cols-[24px_minmax(0,1fr)] gap-2.5 rounded-md border bg-white p-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand',
                  on ? 'border-2 border-brand bg-brand-tint p-[15px]' : 'border-line-strong',
                )}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={option}
                  checked={on}
                  onChange={() => void choose(option)}
                  className="mt-0.5 size-5 accent-brand"
                />
                <span className="flex flex-col gap-1">
                  <strong className="text-body">{t(key)}</strong>
                  <span className="text-small text-muted-ink">{t(`${key}Help`)}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {pending ? null : (
        <Link
          href={`/members/${username}?preview=visitor`}
          className="text-small font-medium text-brand-dark no-underline hover:text-brand hover:underline"
        >
          {t('preview')}
        </Link>
      )}
    </div>
  );
}
