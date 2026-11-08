'use client';

import { LoaderCircle, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { AdminDialog, ConfirmDeleteDialog } from '@/shared/admin-ui/dialogs';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import { SortableList } from '@/shared/admin-ui/sortable-list';
import type { FieldErrors } from '@/shared/forms/action-result';
import { resolveLocalized } from '@/shared/i18n/localized';
import type { Localized } from '@/shared/types/localized';
import { EmptyState } from '@/shared/ui/empty-state';
import { Button } from '@/shared/ui/primitives/button';

import { deleteTeam, reorderTeams, saveTeam } from '../../actions/admin-structure';
import { STRUCTURE_LIMITS, teamSchema } from '../../schemas/structure.schema';
import type { TeamWithCount } from '../../types';

const KNOWN = ['required', 'tooLong', 'duplicate'];

/** Admin › Members › Teams: the chips of the Members page, in order (drag to reorder). */
export function TeamsAdmin({ teams: initial, canEdit }: { teams: TeamWithCount[]; canEdit: boolean }) {
  const t = useTranslations('admin.members.teams');
  const [teams, setTeams] = React.useState(initial);
  const [lastInitial, setLastInitial] = React.useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setTeams(initial);
  }
  const [editing, setEditing] = React.useState<{ team: TeamWithCount | null; key: number } | null>(null);
  const [toDelete, setToDelete] = React.useState<TeamWithCount | null>(null);
  const opened = React.useRef(0);
  const open = (team: TeamWithCount | null) => setEditing({ team, key: ++opened.current });
  const name = (team: TeamWithCount) => resolveLocalized(team.name, 'en');

  const reorder = (next: TeamWithCount[]) => {
    setTeams(next);
    void reorderTeams(next.map((team) => team.id)).then((result) => {
      if (result.ok) toast.success(t('toasts.reordered'));
      else {
        setTeams(initial);
        toast.error(t('toasts.unexpected'));
      }
    });
  };

  return (
    <section aria-labelledby="teams-title" className="flex flex-col gap-4 p-4 md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="teams-title" className="text-[18px] font-bold">
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
      {teams.length === 0 ? (
        <EmptyState variant="admin" icon={<Users />} title={t('empty.title')}>
          {t('empty.text')}
        </EmptyState>
      ) : (
        <SortableList
          items={teams}
          label={t('order')}
          itemName={name}
          onReorder={reorder}
          className="flex flex-col gap-2"
          renderItem={(team, handle) => (
            <div className="flex items-center gap-3 rounded-md border border-line bg-white px-3 py-2.5">
              {canEdit && handle}
              <span className="flex min-w-0 flex-1 flex-col">
                <strong className="font-medium">{name(team)}</strong>
                <span className="text-[13px] text-muted-ink">{t('people', { count: team.members })}</span>
              </span>
              {canEdit && (
                <>
                  <Button
                    variant="quiet"
                    size="sm"
                    aria-label={`${t('edit')} ${name(team)}`}
                    onClick={() => open(team)}
                  >
                    <Pencil aria-hidden />
                    {t('edit')}
                  </Button>
                  <Button
                    variant="dangerOutline"
                    size="sm"
                    aria-label={`${t('delete')} ${name(team)}`}
                    onClick={() => setToDelete(team)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </>
              )}
            </div>
          )}
        />
      )}

      {editing && (
        <TeamDialog
          key={editing.key}
          team={editing.team}
          open
          onOpenChange={(next) => !next && setEditing(null)}
        />
      )}
      {toDelete && toDelete.members > 0 ? (
        <AdminDialog
          open
          onOpenChange={(next) => !next && setToDelete(null)}
          role="alertdialog"
          icon="info"
          title={t('deleting.blockedTitle', { name: name(toDelete) })}
          description={t('deleting.blockedText', { count: toDelete.members })}
          footer={
            <Button size="sm" onClick={() => setToDelete(null)}>
              {t('deleting.ok')}
            </Button>
          }
        />
      ) : (
        <ConfirmDeleteDialog
          open={toDelete !== null}
          onOpenChange={(next) => !next && setToDelete(null)}
          title={toDelete ? t('deleting.title', { name: name(toDelete) }) : ''}
          description={t('deleting.text')}
          confirmLabel={t('deleting.confirm')}
          onConfirm={async () => {
            if (!toDelete) return;
            const result = await deleteTeam(toDelete.id);
            if (result.ok && result.data.status === 'removed') {
              toast.success(t('toasts.deleted'));
              setToDelete(null);
            } else if (result.ok) {
              // Somebody joined meanwhile: the list refreshes and the blocked message shows.
              setToDelete({
                ...toDelete,
                members: result.data.status === 'in_use' ? result.data.members : 0,
              });
            } else toast.error(t(result.error === 'not_found' ? 'toasts.notFound' : 'toasts.unexpected'));
          }}
        />
      )}
    </section>
  );
}

function TeamDialog({
  team,
  open,
  onOpenChange,
}: {
  team: TeamWithCount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('admin.members.teams');
  const tErrors = useTranslations('admin.members.errors');
  const tDialogs = useTranslations('admin.ui.dialogs');
  const id = React.useId();
  const [name, setName] = React.useState<Localized>(team?.name ?? { mk: '' });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [pending, startTransition] = React.useTransition();
  const error = errors.name?.[0]
    ? tErrors(KNOWN.includes(errors.name[0]) ? (errors.name[0] as 'required') : 'unexpected')
    : undefined;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const draft = { name: { mk: name.mk, ...(name.en ? { en: name.en } : {}) } };
    const checked = teamSchema.safeParse(draft);
    if (!checked.success) {
      setErrors({ name: [checked.error.issues[0]?.message ?? 'required'] });
      return;
    }
    startTransition(async () => {
      const result = await saveTeam({ id: team?.id, team: checked.data });
      if (result.ok) {
        toast.success(t(team ? 'toasts.updated' : 'toasts.created'));
        onOpenChange(false);
      } else if (result.error === 'validation') setErrors(result.fieldErrors);
      else toast.error(t(result.error === 'forbidden' ? 'toasts.forbidden' : 'toasts.unexpected'));
    });
  };

  return (
    <AdminDialog
      open={open}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      title={team ? t('dialog.editTitle', { name: resolveLocalized(team.name, 'en') }) : t('dialog.addTitle')}
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
      <form id={id} onSubmit={submit} noValidate>
        <LocalizedField
          id={`${id}-name`}
          label={t('dialog.name')}
          required
          value={name}
          onChange={(next) => {
            setName(next);
            setErrors({});
          }}
          error={error}
          maxLength={STRUCTURE_LIMITS.name}
        />
      </form>
    </AdminDialog>
  );
}
