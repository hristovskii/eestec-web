'use client';

import { Award, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { AdminDialog, ConfirmDeleteDialog } from '@/shared/admin-ui/dialogs';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import type { FieldErrors } from '@/shared/forms/action-result';
import { resolveLocalized } from '@/shared/i18n/localized';
import type { Localized } from '@/shared/types/localized';
import { EmptyState } from '@/shared/ui/empty-state';
import { FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { deleteBadge, saveBadge } from '../../actions/admin-structure';
import { badgeSchema, STRUCTURE_LIMITS } from '../../schemas/structure.schema';
import { BADGE_ICONS, type BadgeIcon, type BadgeWithCount } from '../../types';
import { badgeIcons } from '../badge-icons';

const KNOWN = ['required', 'tooLong', 'duplicate'];

/** Admin › Members › Badges: what the board can give (name, meaning, icon). */
export function BadgesAdmin({ badges, canEdit }: { badges: BadgeWithCount[]; canEdit: boolean }) {
  const t = useTranslations('admin.members.badges');
  const [editing, setEditing] = React.useState<{ badge: BadgeWithCount | null; key: number } | null>(null);
  const [toDelete, setToDelete] = React.useState<BadgeWithCount | null>(null);
  const opened = React.useRef(0);
  const open = (badge: BadgeWithCount | null) => setEditing({ badge, key: ++opened.current });
  const name = (badge: BadgeWithCount) => resolveLocalized(badge.name, 'en');

  return (
    <section aria-labelledby="badges-title" className="flex flex-col gap-4 p-4 md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="badges-title" className="text-[18px] font-bold">
            {t('title')}
          </h2>
          <p className="max-w-[640px] text-small text-muted-ink">{t('text')}</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => open(null)}>
            <Plus aria-hidden />
            {t('add')}
          </Button>
        )}
      </div>
      {badges.length === 0 ? (
        <EmptyState variant="admin" icon={<Award />} title={t('empty.title')}>
          {t('empty.text')}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {badges.map((badge) => {
            const Icon = badgeIcons[badge.icon];
            return (
              <li
                key={badge.id}
                className="flex items-center gap-3 rounded-md border border-line bg-white px-3 py-2.5"
              >
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand"
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <strong className="font-medium">{name(badge)}</strong>
                  <span className="text-[13px] text-muted-ink">
                    {resolveLocalized(badge.description, 'en') || '—'} ·{' '}
                    {t('awarded', { count: badge.awarded })}
                  </span>
                </span>
                {canEdit && (
                  <>
                    <Button
                      variant="quiet"
                      size="sm"
                      aria-label={`${t('edit')} ${name(badge)}`}
                      onClick={() => open(badge)}
                    >
                      <Pencil aria-hidden />
                      {t('edit')}
                    </Button>
                    <Button
                      variant="dangerOutline"
                      size="sm"
                      aria-label={`${t('delete')} ${name(badge)}`}
                      onClick={() => setToDelete(badge)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <BadgeDialog
          key={editing.key}
          badge={editing.badge}
          open
          onOpenChange={(next) => !next && setEditing(null)}
        />
      )}
      <ConfirmDeleteDialog
        open={toDelete !== null}
        onOpenChange={(next) => !next && setToDelete(null)}
        title={toDelete ? t('deleting.title', { name: name(toDelete) }) : ''}
        description={toDelete ? t('deleting.text', { count: toDelete.awarded }) : ''}
        confirmLabel={t('deleting.confirm')}
        onConfirm={async () => {
          if (!toDelete) return;
          const result = await deleteBadge(toDelete.id);
          if (result.ok) {
            toast.success(t('toasts.deleted'));
            setToDelete(null);
          } else toast.error(t(result.error === 'not_found' ? 'toasts.notFound' : 'toasts.unexpected'));
        }}
      />
    </section>
  );
}

function BadgeDialog({
  badge,
  open,
  onOpenChange,
}: {
  badge: BadgeWithCount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('admin.members.badges');
  const tErrors = useTranslations('admin.members.errors');
  const tDialogs = useTranslations('admin.ui.dialogs');
  const id = React.useId();
  const [name, setName] = React.useState<Localized>(badge?.name ?? { mk: '' });
  const [description, setDescription] = React.useState<Localized>(badge?.description ?? { mk: '' });
  const [icon, setIcon] = React.useState<BadgeIcon>(badge?.icon ?? 'award');
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [pending, startTransition] = React.useTransition();
  const error = (field: string) => {
    const key = errors[field]?.[0] ?? errors[`${field}.mk`]?.[0];
    return key ? tErrors(KNOWN.includes(key) ? (key as 'required') : 'unexpected') : undefined;
  };
  const clean = (value: Localized) => ({ mk: value.mk, ...(value.en ? { en: value.en } : {}) });
  const Icon = badgeIcons[icon];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const checked = badgeSchema.safeParse({ name: clean(name), description: clean(description), icon });
    if (!checked.success) {
      const next: FieldErrors = {};
      for (const issue of checked.error.issues) (next[String(issue.path[0])] ??= []).push(issue.message);
      setErrors(next);
      return;
    }
    startTransition(async () => {
      const result = await saveBadge({ id: badge?.id, badge: checked.data });
      if (result.ok) {
        toast.success(t(badge ? 'toasts.updated' : 'toasts.created'));
        onOpenChange(false);
      } else if (result.error === 'validation') setErrors(result.fieldErrors);
      else toast.error(t(result.error === 'forbidden' ? 'toasts.forbidden' : 'toasts.unexpected'));
    });
  };

  return (
    <AdminDialog
      open={open}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      title={
        badge ? t('dialog.editTitle', { name: resolveLocalized(badge.name, 'en') }) : t('dialog.addTitle')
      }
      footer={
        <>
          <Button variant="quiet" size="sm" onClick={() => onOpenChange(false)} disabled={pending}>
            {tDialogs('cancel')}
          </Button>
          <Button type="submit" form={id} size="sm" disabled={pending} aria-busy={pending || undefined}>
            {pending ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden />
                {t('dialog.saving')}
              </>
            ) : (
              t('dialog.save')
            )}
          </Button>
        </>
      }
    >
      <form id={id} onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        <LocalizedField
          id={`${id}-name`}
          label={t('dialog.name')}
          required
          value={name}
          onChange={(next) => {
            setName(next);
            setErrors((current) => ({ ...current, name: [], 'name.mk': [] }));
          }}
          error={error('name')}
          maxLength={STRUCTURE_LIMITS.name}
        />
        <LocalizedField
          id={`${id}-description`}
          label={t('dialog.description')}
          help={t('dialog.descriptionHelp')}
          value={description}
          onChange={setDescription}
          error={error('description')}
          maxLength={STRUCTURE_LIMITS.description}
        />
        <FormField id={`${id}-icon`} label={t('dialog.icon')}>
          {(control) => (
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand"
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <NativeSelect
                {...control}
                value={icon}
                onChange={(event) => setIcon(event.target.value as BadgeIcon)}
              >
                {BADGE_ICONS.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {t(`dialog.icons.${value}`)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          )}
        </FormField>
      </form>
    </AdminDialog>
  );
}
