'use client';

import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { AdminBadge } from '@/shared/admin-ui/admin-page';
import { FieldError } from '@/shared/ui/form/form-field';
import { Input } from '@/shared/ui/primitives/input';
import { Switch } from '@/shared/ui/primitives/switch';

import { NOTIFICATION_KINDS, type NotificationKind, PHASE2_NOTIFICATIONS } from '../../types';
import { fieldId, type SectionProps, SettingsPanel } from './form-kit';

const splitEmails = (raw: string) =>
  raw
    .split(/[,\s;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

function NotificationRow({
  kind,
  enabled,
  recipients,
  onChange,
  error,
}: {
  kind: NotificationKind;
  enabled: boolean;
  recipients: string[];
  onChange: (next: { enabled: boolean; recipients: string[] }) => void;
  error?: string;
}) {
  const t = useTranslations('admin.settings.notifications');
  const id = fieldId(`notifications.${kind}.recipients`);
  // The text as typed ("a@b.mk, "); the stored value is the parsed list.
  const [raw, setRaw] = React.useState(recipients.join(', '));
  const [lastRecipients, setLastRecipients] = React.useState(recipients);
  if (recipients !== lastRecipients) {
    setLastRecipients(recipients);
    if (splitEmails(raw).join() !== recipients.join()) setRaw(recipients.join(', '));
  }
  return (
    <div className="grid items-start gap-2.5 border-b border-divider py-3.5 last:border-b-0 md:grid-cols-[260px_minmax(0,1fr)] md:gap-4">
      <span className="flex items-center justify-between gap-3 md:h-(--control-h)">
        <label htmlFor={`${id}-on`} className="cursor-pointer font-medium">
          {t(`kinds.${kind}`)}
        </label>
        <Switch
          id={`${id}-on`}
          size="sm"
          checked={enabled}
          onCheckedChange={(checked) => onChange({ enabled: checked, recipients })}
        />
      </span>
      <div className="flex flex-col">
        <Input
          id={id}
          aria-label={`${t('recipients')}: ${t(`kinds.${kind}`)}`}
          aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
          aria-invalid={error ? true : undefined}
          value={raw}
          disabled={!enabled}
          onChange={(event) => {
            setRaw(event.target.value);
            onChange({ enabled, recipients: splitEmails(event.target.value) });
          }}
          className="md:text-small"
        />
        {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
        <span id={`${id}-help`} className="sr-only">
          {t('recipientsHelp')}
        </span>
      </div>
    </div>
  );
}

export function NotificationsSection({ values, update, error, phase2 }: SectionProps & { phase2: boolean }) {
  const t = useTranslations('admin.settings');
  const kinds = NOTIFICATION_KINDS.filter((kind) => phase2 || !PHASE2_NOTIFICATIONS.includes(kind));
  return (
    <SettingsPanel id="notifications" title={t('sections.notifications')} aside={t('notifications.hint')}>
      <p className="text-small text-muted-ink">
        {t('notifications.recipientsHelp')} {t('notifications.contactNote')}
      </p>
      <div>
        {kinds.map((kind) => (
          <NotificationRow
            key={kind}
            kind={kind}
            {...values.notifications[kind]}
            error={error(`notifications.${kind}.recipients`) ?? error(`notifications.${kind}.recipients.0`)}
            onChange={(next) => update((draft) => void (draft.notifications[kind] = next))}
          />
        ))}
      </div>
    </SettingsPanel>
  );
}

/** A read-only fact: title, text, and a "decided" or value badge. */
function Fact({
  title,
  children,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-divider pb-3.5 last:border-b-0 last:pb-0">
      <Check className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 font-medium">
          {title}
          {badge}
        </span>
        <span className="text-small text-muted-ink">{children}</span>
      </div>
    </div>
  );
}

export function LanguagesSection() {
  const t = useTranslations('admin.settings');
  return (
    <SettingsPanel id="languages" title={t('sections.languages')} aside={t('languages.hint')}>
      <Fact title={t('languages.mk')} badge={<AdminBadge tone="dark">{t('languages.default')}</AdminBadge>}>
        {t('languages.mkText')}
      </Fact>
      <Fact
        title={t('languages.en')}
        badge={<AdminBadge tone="neutral">{t('languages.optional')}</AdminBadge>}
      >
        {t('languages.enText')}
      </Fact>
      <p className="text-small text-muted-ink">{t('languages.admin')}</p>
    </SettingsPanel>
  );
}

export function ActivitySection({ children }: { children: React.ReactNode }) {
  const t = useTranslations('admin');
  return (
    <SettingsPanel
      id="activity"
      title={t('settings.sections.activity')}
      aside={
        <Link
          href="/admin/activity"
          className="inline-flex items-center gap-1 font-medium text-brand-dark no-underline hover:underline"
        >
          {t('activity.openLog')}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      }
      flush
    >
      {children}
    </SettingsPanel>
  );
}

export function SecuritySection({
  values,
  update,
  error,
  lockout,
}: SectionProps & { lockout: { attempts: number; minutes: number } }) {
  const t = useTranslations('admin.settings');
  const id = fieldId('retentionMonths');
  const retentionError = error('retentionMonths');
  return (
    <SettingsPanel id="security" title={t('sections.security')} aside={t('security.hint')}>
      <Fact title={t('security.twoStep')}>{t('security.twoStepText')}</Fact>
      <Fact title={t('security.lockout')}>{t('security.lockoutText', lockout)}</Fact>
      <Fact title={t('security.links')}>{t('security.linksText')}</Fact>
      <Fact title={t('security.backups')}>{t('security.backupsText')}</Fact>
      <div className="flex flex-col border-t border-divider pt-4.5">
        <label htmlFor={id} className="mb-1.5 text-small font-medium">
          {t('security.retention')}
        </label>
        <span className="flex items-center gap-2.5 text-small">
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            value={Number.isNaN(values.retentionMonths) ? '' : values.retentionMonths}
            aria-invalid={retentionError ? true : undefined}
            aria-describedby={`${id}-help${retentionError ? ` ${id}-error` : ''}`}
            onChange={(event) =>
              update(
                (draft) =>
                  void (draft.retentionMonths =
                    event.target.value === '' ? Number.NaN : Number(event.target.value)),
              )
            }
            className="w-20 text-right md:text-small"
          />
          {t('security.retentionAfter')}
        </span>
        {retentionError && <FieldError id={`${id}-error`}>{retentionError}</FieldError>}
        <span id={`${id}-help`} className="mt-1.5 text-small text-muted-ink">
          {t('security.retentionHelp')}
        </span>
      </div>
    </SettingsPanel>
  );
}
