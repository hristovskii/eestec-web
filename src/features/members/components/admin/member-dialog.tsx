'use client';

import { ExternalLink, LoaderCircle, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { AdminDialog } from '@/shared/admin-ui/dialogs';
import { SwitchRow } from '@/shared/admin-ui/form-section';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import type { FieldErrors } from '@/shared/forms/action-result';
import { resolveLocalized } from '@/shared/i18n/localized';
import type { Localized } from '@/shared/types/localized';
import { FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { saveMemberProfile } from '../../actions/admin-members';
import { profileEditSchema } from '../../schemas/profile-edit.schema';
import {
  type Badge,
  EVENT_ROLES,
  type EventRole,
  PROFILE_STATUSES,
  type Profile,
  type ProfileStatus,
  TEAM_ROLES,
  type Team,
  type TeamRole,
} from '../../types';

type Values = {
  status: ProfileStatus;
  memberSince: string;
  activeTo: string;
  teams: { teamId: string; role: TeamRole }[];
  badges: { badgeId: string; note: string }[];
  events: { eventId: string; role: EventRole }[];
  alumniNow: Localized;
  alumniHighlight: Localized;
  hidePhoto: boolean;
  hideBio: boolean;
};

const KNOWN = ['required', 'tooLong', 'tooMany', 'date', 'order', 'duplicate'];
const ORDER = [
  'status',
  'memberSince',
  'activeTo',
  'teams',
  'badges',
  'events',
  'alumniNow',
  'alumniHighlight',
];

const toValues = (profile: Profile): Values => ({
  status: profile.status,
  memberSince: profile.memberSince,
  activeTo: profile.activeTo ?? '',
  teams: profile.teams.map((entry) => ({ ...entry })),
  badges: profile.badges.map(({ badgeId, note }) => ({ badgeId, note })),
  events: profile.events.map((entry) => ({ ...entry })),
  alumniNow: profile.alumniNow ?? { mk: '' },
  alumniHighlight: profile.alumniHighlight ?? { mk: '' },
  hidePhoto: profile.hidePhoto,
  hideBio: profile.hideBio,
});

const nameOr = <T,>(item: T | undefined, name: (item: T) => string, fallback: string) =>
  item ? name(item) : fallback;

const lineOrNull = (value: Localized) =>
  value.mk.trim() === '' && !value.en?.trim()
    ? null
    : { mk: value.mk, ...(value.en ? { en: value.en } : {}) };

/** Edit what the board edits on a profile (Admin › Members). */
export function MemberDialog({
  profile,
  teams,
  badges,
  events,
  open,
  onOpenChange,
}: {
  profile: Profile;
  teams: Team[];
  badges: Badge[];
  events: { id: string; title: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('admin.members');
  const tDialogs = useTranslations('admin.ui.dialogs');
  const id = React.useId();
  const statusRef = React.useRef<HTMLSelectElement>(null);
  const [values, setValues] = React.useState<Values>(() => toValues(profile));
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [pending, startTransition] = React.useTransition();
  const alumnus = values.status === 'alumni';

  const error = (field: string) => {
    const key = errors[field]?.[0];
    return key ? t(`errors.${KNOWN.includes(key) ? (key as 'required') : 'unexpected'}`) : undefined;
  };
  const edit = (patch: Partial<Values>) => {
    setValues((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const field of Object.keys(patch)) delete next[field];
      return next;
    });
  };
  const close = (next: boolean) => {
    if (!pending) onOpenChange(next);
  };
  const fieldId = (field: string) => `${id}-${field}`;
  const teamName = (team: Team) => resolveLocalized(team.name, 'en');
  const badgeName = (badge: Badge) => resolveLocalized(badge.name, 'en');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const draft = {
      status: values.status,
      memberSince: values.memberSince,
      activeTo: alumnus && values.activeTo ? values.activeTo : null,
      teams: values.teams,
      badges: values.badges,
      events: values.events,
      alumniNow: alumnus ? lineOrNull(values.alumniNow) : null,
      alumniHighlight: alumnus ? lineOrNull(values.alumniHighlight) : null,
      hidePhoto: values.hidePhoto,
      hideBio: values.hideBio,
    };
    const checked = profileEditSchema.safeParse(draft);
    const fail = (next: FieldErrors) => {
      setErrors(next);
      const first = ORDER.find(
        (field) => next[field] ?? Object.keys(next).some((key) => key.startsWith(`${field}.`)),
      );
      document.getElementById(fieldId(first ?? 'status'))?.focus();
    };
    if (!checked.success) {
      const next: FieldErrors = {};
      for (const issue of checked.error.issues) (next[String(issue.path[0])] ??= []).push(issue.message);
      fail(next);
      return;
    }
    startTransition(async () => {
      const result = await saveMemberProfile({ userId: profile.userId, edit: checked.data });
      if (result.ok) {
        toast.success(t('toasts.updated'));
        onOpenChange(false);
        return;
      }
      if (result.error === 'validation') fail(result.fieldErrors);
      else
        toast.error(
          t(
            result.error === 'forbidden'
              ? 'toasts.forbidden'
              : result.error === 'not_found'
                ? 'toasts.notFound'
                : 'toasts.unexpected',
          ),
        );
    });
  };

  const removeButton = (item: string, onClick: () => void) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-9 shrink-0"
      aria-label={t('dialog.remove', { item })}
      onClick={onClick}
    >
      <X aria-hidden />
    </Button>
  );

  return (
    <AdminDialog
      open={open}
      onOpenChange={close}
      size="lg"
      title={t('dialog.title', { name: profile.name })}
      description={t('dialog.text')}
      initialFocus={statusRef}
      footer={
        <>
          <Button variant="quiet" size="sm" onClick={() => close(false)} disabled={pending}>
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
      <form id={id} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <a
          href={`/members/${profile.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 self-start text-small font-medium text-brand-dark"
        >
          <ExternalLink className="size-4" aria-hidden />
          {t('dialog.viewProfile')}
        </a>

        <div className="grid gap-3 sm:grid-cols-3">
          <FormField
            id={fieldId('status')}
            label={t('dialog.status')}
            required
            error={error('status')}
            help={t(`dialog.statusHelp.${values.status}`)}
          >
            {(control) => (
              <NativeSelect
                {...control}
                ref={statusRef}
                value={values.status}
                onChange={(event) => edit({ status: event.target.value as ProfileStatus })}
              >
                {PROFILE_STATUSES.map((status) => (
                  <NativeSelectOption key={status} value={status}>
                    {t(`statuses.${status}`)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField
            id={fieldId('memberSince')}
            label={t('dialog.since')}
            required
            error={error('memberSince')}
          >
            {(control) => (
              <Input
                {...control}
                type="date"
                value={values.memberSince}
                onChange={(event) => edit({ memberSince: event.target.value })}
              />
            )}
          </FormField>
          {alumnus && (
            <FormField id={fieldId('activeTo')} label={t('dialog.until')} error={error('activeTo')}>
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  value={values.activeTo}
                  onChange={(event) => edit({ activeTo: event.target.value })}
                />
              )}
            </FormField>
          )}
        </div>

        {alumnus && (
          <div className="grid gap-3 sm:grid-cols-2">
            <LocalizedField
              id={fieldId('alumniNow')}
              label={t('dialog.alumniNow')}
              help={t('dialog.alumniNowHelp')}
              value={values.alumniNow}
              onChange={(alumniNow) => edit({ alumniNow })}
              error={error('alumniNow')}
              maxLength={120}
            />
            <LocalizedField
              id={fieldId('alumniHighlight')}
              label={t('dialog.alumniHighlight')}
              help={t('dialog.alumniHighlightHelp')}
              value={values.alumniHighlight}
              onChange={(alumniHighlight) => edit({ alumniHighlight })}
              error={error('alumniHighlight')}
              maxLength={120}
            />
          </div>
        )}

        <fieldset id={fieldId('teams')} tabIndex={-1} className="flex flex-col gap-2.5">
          <legend className="mb-1 text-small font-bold">{t('dialog.teams')}</legend>
          {values.teams.length === 0 && <p className="text-small text-muted-ink">{t('dialog.teamsEmpty')}</p>}
          {values.teams.map((entry, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,1fr)_150px_auto] items-end gap-2">
              <FormField id={fieldId(`team-${index}`)} label={t('dialog.team')}>
                {(control) => (
                  <NativeSelect
                    {...control}
                    value={entry.teamId}
                    onChange={(event) =>
                      edit({
                        teams: values.teams.map((item, at) =>
                          at === index ? { ...item, teamId: event.target.value } : item,
                        ),
                      })
                    }
                  >
                    {teams.map((team) => (
                      <NativeSelectOption key={team.id} value={team.id}>
                        {teamName(team)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              <FormField id={fieldId(`teamRole-${index}`)} label={t('dialog.teamRole')}>
                {(control) => (
                  <NativeSelect
                    {...control}
                    value={entry.role}
                    onChange={(event) =>
                      edit({
                        teams: values.teams.map((item, at) =>
                          at === index ? { ...item, role: event.target.value as TeamRole } : item,
                        ),
                      })
                    }
                  >
                    {TEAM_ROLES.map((role) => (
                      <NativeSelectOption key={role} value={role}>
                        {t(`dialog.roles.${role}`)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              {removeButton(
                nameOr(
                  teams.find((team) => team.id === entry.teamId),
                  teamName,
                  entry.teamId,
                ),
                () => edit({ teams: values.teams.filter((_, at) => at !== index) }),
              )}
            </div>
          ))}
          {error('teams') && <p className="text-small font-medium text-brand-dark">{error('teams')}</p>}
          <Button
            type="button"
            variant="quiet"
            size="sm"
            className="self-start"
            disabled={values.teams.length >= teams.length}
            onClick={() => {
              const free = teams.find((team) => !values.teams.some((entry) => entry.teamId === team.id));
              if (free) edit({ teams: [...values.teams, { teamId: free.id, role: 'member' }] });
            }}
          >
            <Plus aria-hidden />
            {t('dialog.teamAdd')}
          </Button>
        </fieldset>

        <fieldset id={fieldId('badges')} tabIndex={-1} className="flex flex-col gap-2.5">
          <legend className="mb-1 text-small font-bold">{t('dialog.badges')}</legend>
          {values.badges.length === 0 && (
            <p className="text-small text-muted-ink">{t('dialog.badgesEmpty')}</p>
          )}
          {values.badges.map((entry, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] items-end gap-2">
              <FormField id={fieldId(`badge-${index}`)} label={t('dialog.badge')}>
                {(control) => (
                  <NativeSelect
                    {...control}
                    value={entry.badgeId}
                    onChange={(event) =>
                      edit({
                        badges: values.badges.map((item, at) =>
                          at === index ? { ...item, badgeId: event.target.value } : item,
                        ),
                      })
                    }
                  >
                    {badges.map((badge) => (
                      <NativeSelectOption key={badge.id} value={badge.id}>
                        {badgeName(badge)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              <FormField id={fieldId(`badgeNote-${index}`)} label={t('dialog.badgeNote')}>
                {(control) => (
                  <Input
                    {...control}
                    value={entry.note}
                    maxLength={120}
                    placeholder={t('dialog.badgeNotePlaceholder')}
                    onChange={(event) =>
                      edit({
                        badges: values.badges.map((item, at) =>
                          at === index ? { ...item, note: event.target.value } : item,
                        ),
                      })
                    }
                  />
                )}
              </FormField>
              {removeButton(
                nameOr(
                  badges.find((badge) => badge.id === entry.badgeId),
                  badgeName,
                  entry.badgeId,
                ),
                () => edit({ badges: values.badges.filter((_, at) => at !== index) }),
              )}
            </div>
          ))}
          {error('badges') && <p className="text-small font-medium text-brand-dark">{error('badges')}</p>}
          <Button
            type="button"
            variant="quiet"
            size="sm"
            className="self-start"
            disabled={values.badges.length >= badges.length}
            onClick={() => {
              const free = badges.find((badge) => !values.badges.some((entry) => entry.badgeId === badge.id));
              if (free) edit({ badges: [...values.badges, { badgeId: free.id, note: '' }] });
            }}
          >
            <Plus aria-hidden />
            {t('dialog.badgeAdd')}
          </Button>
        </fieldset>

        <fieldset id={fieldId('events')} tabIndex={-1} className="flex flex-col gap-2.5">
          <legend className="mb-1 text-small font-bold">{t('dialog.events')}</legend>
          {values.events.length === 0 && (
            <p className="text-small text-muted-ink">{t('dialog.eventsEmpty')}</p>
          )}
          {values.events.map((entry, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,1fr)_150px_auto] items-end gap-2">
              <FormField id={fieldId(`event-${index}`)} label={t('dialog.event')}>
                {(control) => (
                  <NativeSelect
                    {...control}
                    value={entry.eventId}
                    onChange={(event) =>
                      edit({
                        events: values.events.map((item, at) =>
                          at === index ? { ...item, eventId: event.target.value } : item,
                        ),
                      })
                    }
                  >
                    {events.map((option) => (
                      <NativeSelectOption key={option.id} value={option.id}>
                        {option.title}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              <FormField id={fieldId(`eventRole-${index}`)} label={t('dialog.eventRole')}>
                {(control) => (
                  <NativeSelect
                    {...control}
                    value={entry.role}
                    onChange={(event) =>
                      edit({
                        events: values.events.map((item, at) =>
                          at === index ? { ...item, role: event.target.value as EventRole } : item,
                        ),
                      })
                    }
                  >
                    {EVENT_ROLES.map((role) => (
                      <NativeSelectOption key={role} value={role}>
                        {t(`dialog.eventRoles.${role}`)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              {removeButton(
                events.find((option) => option.id === entry.eventId)?.title ?? entry.eventId,
                () => edit({ events: values.events.filter((_, at) => at !== index) }),
              )}
            </div>
          ))}
          {error('events') && <p className="text-small font-medium text-brand-dark">{error('events')}</p>}
          <Button
            type="button"
            variant="quiet"
            size="sm"
            className="self-start"
            disabled={values.events.length >= events.length}
            onClick={() => {
              const free = events.find(
                (option) => !values.events.some((entry) => entry.eventId === option.id),
              );
              if (free) edit({ events: [...values.events, { eventId: free.id, role: 'participant' }] });
            }}
          >
            <Plus aria-hidden />
            {t('dialog.eventAdd')}
          </Button>
        </fieldset>

        <div className="flex flex-col gap-2 rounded-md bg-surface p-3.5">
          <strong className="text-small">{t('dialog.moderation')}</strong>
          <SwitchRow
            id={fieldId('hidePhoto')}
            label={t('dialog.hidePhoto')}
            checked={values.hidePhoto}
            onChange={(hidePhoto) => edit({ hidePhoto })}
          />
          <SwitchRow
            id={fieldId('hideBio')}
            label={t('dialog.hideBio')}
            checked={values.hideBio}
            onChange={(hideBio) => edit({ hideBio })}
          />
          <p className="text-[13px] text-muted-ink">{t('dialog.moderationHelp')}</p>
        </div>
      </form>
    </AdminDialog>
  );
}
