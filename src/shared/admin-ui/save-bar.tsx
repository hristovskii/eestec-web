'use client';

import { ArrowLeft, Check, LoaderCircle } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';
import { useNow } from '@/shared/ui/clock-provider';
import { Button } from '@/shared/ui/primitives/button';

import { AdminBadge, type AdminBadgeTone } from './admin-page';

export type SaveState = 'clean' | 'dirty' | 'saving';

type SaveBarProps = {
  title: string;
  status: { label: string; tone: AdminBadgeTone };
  state: SaveState;
  /** Published content: edits stay off the live page until "Update live page". */
  published: boolean;
  /** Last successful save, for "All changes saved · 4 min ago". */
  savedAt?: Date | string;
  onPreview?: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onDiscard: () => void;
  /** Edit pages: the ← back to the list and the line under the title (AdminEventEdit). */
  back?: { href: string; label: string };
  subtitle?: React.ReactNode;
  /** The edit page's own heading (h1); the lab shows several bars, so h2 there. */
  headingLevel?: 1 | 2;
  className?: string;
};

/**
 * Sticky under the top bar on every edit screen (AdminEditStates): no changes · unsaved changes ·
 * saving · published, then edited. "Save draft" always works; "Publish" validates first.
 */
export function SaveBar({
  title,
  status,
  state,
  published,
  savedAt,
  onPreview,
  onSaveDraft,
  onPublish,
  onDiscard,
  back,
  subtitle,
  headingLevel = 2,
  className,
}: SaveBarProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const t = useTranslations('admin.ui.saveBar');
  const saving = state === 'saving';

  return (
    <div
      role="region"
      aria-label={t('label')}
      aria-busy={saving || undefined}
      className={cn(
        'sticky top-14 z-10 flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-md border border-line bg-white px-4 py-3 md:top-15 md:px-5',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3.5">
        {back && (
          <Button asChild variant="ghost" size="icon" className="size-9 shrink-0">
            <Link href={back.href as Route} aria-label={back.label}>
              <ArrowLeft aria-hidden />
            </Link>
          </Button>
        )}
        <div className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-2.5">
            <Heading className="truncate text-[17px] font-bold md:text-[20px]">{title}</Heading>
            <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
          </span>
          {subtitle && <span className="truncate text-[13px] text-muted-ink">{subtitle}</span>}
        </div>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-x-3.5 gap-y-2">
        <SaveStatus state={state} published={published} savedAt={savedAt} />
        {published && state === 'dirty' ? (
          <>
            <Button variant="ghost" size="sm" onClick={onDiscard}>
              {t('discard')}
            </Button>
            <Button size="sm" onClick={onPublish}>
              {t('updateLive')}
            </Button>
          </>
        ) : (
          <>
            {onPreview && (
              <Button variant="ghost" size="sm" onClick={onPreview} disabled={saving}>
                {t('preview')}
              </Button>
            )}
            {!published && (
              <Button variant="quiet" size="sm" onClick={onSaveDraft} disabled={state !== 'dirty'}>
                {t('saveDraft')}
              </Button>
            )}
            <Button
              size="sm"
              onClick={onPublish}
              // Published and unchanged: nothing to update.
              disabled={saving || (published && state === 'clean')}
            >
              {published ? t('updateLive') : t('publish')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function SaveStatus({
  state,
  published,
  savedAt,
}: {
  state: SaveState;
  published: boolean;
  savedAt?: Date | string;
}) {
  const t = useTranslations('admin.ui.saveBar');
  const format = useFormatter();
  const saved = savedAt ? new Date(savedAt) : undefined;
  const now = useNow(saved ?? new Date(0), 30_000);

  if (state === 'saving')
    return (
      <span role="status" className="flex items-center gap-2 text-[13px] text-muted-ink">
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
        {t('saving')}
      </span>
    );
  if (state === 'dirty')
    return (
      <span role="status" className="flex items-center gap-2 text-[13px] font-medium">
        <span aria-hidden className="size-2 rounded-full bg-brand" />
        {published ? t('unsavedLive') : t('unsaved')}
      </span>
    );
  return (
    <span role="status" className="flex items-center gap-1.5 text-[13px] text-muted-ink">
      <Check className="size-3.5" aria-hidden />
      {saved ? t('savedAgo', { time: format.relativeTime(saved, now) }) : t('saved')}
    </span>
  );
}
