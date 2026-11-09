'use client';

import { CalendarPlus, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { useUrlParams } from '@/shared/admin-ui/use-url-params';
import { Button } from '@/shared/ui/primitives/button';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { acceptIdea, assignOwner } from '../../actions/admin-ideas';

/** "Daniel Ristov / No owner" in the detail header: who on the board takes this. */
export function OwnerSelect({
  kind,
  id,
  ownerId,
  owners,
}: {
  kind: 'idea' | 'feedback';
  id: string;
  ownerId: string | null;
  owners: { id: string; name: string }[];
}) {
  const t = useTranslations('admin.ideas');
  const [value, setValue] = React.useState(ownerId ?? '');
  const [pending, startTransition] = React.useTransition();
  return (
    <NativeSelect
      aria-label={t('detail.owner')}
      value={value}
      disabled={pending}
      className="w-44"
      onChange={(event) => {
        const next = event.target.value;
        const before = value;
        setValue(next);
        startTransition(async () => {
          const result = await assignOwner({ kind, id, ownerId: next || null }).catch(() => null);
          if (result?.ok) toast.success(t('toasts.ownerChanged'));
          else {
            setValue(before);
            toast.error(
              result && !result.ok && result.error === 'forbidden'
                ? t('toasts.forbidden')
                : t('toasts.error'),
            );
          }
        });
      }}
    >
      <NativeSelectOption value="">{t('detail.noOwner')}</NativeSelectOption>
      {owners.map((owner) => (
        <NativeSelectOption key={owner.id} value={owner.id}>
          {owner.name}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

/** "Accept and create event draft"; once there is a draft, a link to it instead. */
export function AcceptIdeaButton({ id, eventDraftId }: { id: string; eventDraftId: string | null }) {
  const t = useTranslations('admin.ideas');
  const [pending, startTransition] = React.useTransition();
  if (eventDraftId)
    return (
      <Button asChild variant="quiet">
        <Link href={`/admin/events/${eventDraftId}` as never}>
          <ExternalLink aria-hidden />
          {t('detail.openDraft')}
        </Link>
      </Button>
    );
  return (
    <Button
      variant="quiet"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await acceptIdea({ id }).catch(() => null);
          if (result?.ok) toast.success(t('toasts.accepted'));
          else
            toast.error(
              result && !result.ok && result.error === 'forbidden'
                ? t('toasts.forbidden')
                : t('toasts.error'),
            );
        })
      }
    >
      <CalendarPlus aria-hidden />
      {t('detail.accept')}
    </Button>
  );
}

/** The academic year of Ratings per event (`?year=`; "All time" is `all`). */
export function YearSelect({
  label,
  value,
  options,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  const { update } = useUrlParams();
  return (
    <NativeSelect
      aria-label={label}
      value={value}
      className="w-52"
      onChange={(event) => update({ year: event.target.value })}
    >
      {options.map((option) => (
        <NativeSelectOption key={option.value} value={option.value}>
          {option.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
