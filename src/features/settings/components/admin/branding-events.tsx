'use client';

import { ArrowRight, Download } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { type MediaItem } from '@/features/media';
import { MediaPicker } from '@/features/media/admin';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import { cn } from '@/shared/lib/cn';
import { FieldError, FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';

import type { Branding, ImageAsset } from '../../types';
import { fieldId, type SectionProps, SettingsPanel, SwitchRow } from './form-kit';

/** A library image as stored in settings. */
export const assetFrom = (item: MediaItem): ImageAsset => ({
  mediaId: item.id,
  src: item.src ?? '',
  fileName: item.fileName,
  width: item.width ?? 1200,
  height: item.height ?? 630,
  alt: item.alt ?? '',
});

const LOGOS: { key: keyof Branding; surface: string }[] = [
  { key: 'fullColor', surface: 'bg-white' },
  { key: 'white', surface: 'bg-brand' },
  { key: 'icon', surface: 'bg-surface' },
];

export function BrandingSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.settings');
  const [picking, setPicking] = React.useState<keyof Branding | null>(null);

  return (
    <SettingsPanel id="branding" title={t('sections.branding')} aside={t('branding.hint')}>
      <div className="grid gap-4 sm:grid-cols-3">
        {LOGOS.map(({ key, surface }) => {
          const asset = values.branding[key];
          return (
            <div key={key} className="flex flex-col gap-2.5">
              <span className="text-[13px] font-medium">{t(`branding.${key}`)}</span>
              <div
                className={cn(
                  'relative flex h-33 items-center justify-center overflow-hidden rounded-md border border-line',
                  surface,
                )}
              >
                <Image
                  src={asset.src}
                  alt=""
                  width={asset.width}
                  height={asset.height}
                  unoptimized
                  className={cn('h-19 w-auto', key === 'icon' && 'h-18 rounded-lg')}
                />
              </div>
              <span className="truncate text-[13px] text-muted-ink">
                {asset.fileName} · {asset.width} × {asset.height}
              </span>
              <span className="flex gap-1.5 [&_[data-slot=button]]:h-[30px] [&_[data-slot=button]]:px-2.5 [&_[data-slot=button]]:text-[13px]">
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => setPicking(key)}
                  aria-label={`${t('branding.replace')}: ${t(`branding.${key}`)}`}
                >
                  {t('branding.replace')}
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <a href={asset.src} download={asset.fileName}>
                    <Download aria-hidden />
                    {t('branding.download')}
                  </a>
                </Button>
              </span>
              <span className="text-[13px] text-muted-ink">{t(`branding.${key}Use`)}</span>
            </div>
          );
        })}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField id={fieldId('siteName')} label={t('branding.siteName')} required error={error('siteName')}>
          {(control) => (
            <Input
              {...control}
              value={values.siteName}
              onChange={(event) => update((draft) => void (draft.siteName = event.target.value))}
              className="md:text-small"
            />
          )}
        </FormField>
        <LocalizedField
          id={fieldId('footerTagline')}
          label={t('branding.footerTagline')}
          required
          value={values.footerTagline}
          onChange={(value) => update((draft) => void (draft.footerTagline = value))}
          error={error('footerTagline.mk')}
        />
      </div>
      <MediaPicker
        open={picking !== null}
        onOpenChange={(open) => !open && setPicking(null)}
        currentId={picking ? values.branding[picking].mediaId : null}
        onPick={(item) => {
          if (!picking) return;
          update((draft) => void (draft.branding[picking] = assetFrom(item)));
        }}
      />
    </SettingsPanel>
  );
}

/** "Starts [72] hours before the application deadline". */
function NumberSentence({
  path,
  label,
  before,
  after,
  value,
  onChange,
  error,
}: {
  path: string;
  label: string;
  before?: string;
  after: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
}) {
  const id = fieldId(path);
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mb-1.5 text-[13px] font-medium">
        {label}
      </label>
      <span className="flex items-center gap-2.5 text-small">
        {before && <span aria-hidden>{before}</span>}
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          value={Number.isNaN(value) ? '' : value}
          onChange={(event) => onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-unit${error ? ` ${id}-error` : ''}`}
          className="w-20 text-right md:text-small"
        />
        <span id={`${id}-unit`}>{after}</span>
      </span>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

export function EventsSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.settings');
  const events = values.events;
  return (
    <SettingsPanel
      id="events"
      title={t('sections.events')}
      aside={
        <Link
          href="/admin/events/types"
          className="inline-flex items-center gap-1 font-medium text-brand-dark no-underline hover:underline"
        >
          {t('events.types')}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <NumberSentence
          path="events.deadlineSoonHours"
          label={t('events.deadlineSoon')}
          before={t('events.deadlineSoonBefore')}
          after={t('events.deadlineSoonAfter')}
          value={events.deadlineSoonHours}
          onChange={(value) => update((draft) => void (draft.events.deadlineSoonHours = value))}
          error={error('events.deadlineSoonHours')}
        />
        <NumberSentence
          path="events.justEndedDays"
          label={t('events.justEnded')}
          before={t('events.justEndedBefore')}
          after={t('events.justEndedAfter')}
          value={events.justEndedDays}
          onChange={(value) => update((draft) => void (draft.events.justEndedDays = value))}
          error={error('events.justEndedDays')}
        />
        <NumberSentence
          path="events.defaultMaxParticipants"
          label={t('events.maxParticipants')}
          after={t('events.maxParticipantsAfter')}
          value={events.defaultMaxParticipants}
          onChange={(value) => update((draft) => void (draft.events.defaultMaxParticipants = value))}
          error={error('events.defaultMaxParticipants')}
        />
        <div className="flex flex-col gap-3 md:pt-5.5">
          <SwitchRow
            id="s-events-waitlist"
            label={t('events.waitlist')}
            checked={events.defaultWaitlistEnabled}
            onChange={(checked) => update((draft) => void (draft.events.defaultWaitlistEnabled = checked))}
          />
          <SwitchRow
            id="s-events-autoclose"
            label={t('events.autoClose')}
            checked={events.autoCloseApplications}
            onChange={(checked) => update((draft) => void (draft.events.autoCloseApplications = checked))}
          />
        </div>
      </div>
    </SettingsPanel>
  );
}
