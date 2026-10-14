'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import type { MediaItem } from '@/features/media';
import { MediaThumb } from '@/features/media/admin';
import { AdminBadge, type AdminBadgeTone } from '@/shared/admin-ui/admin-page';
import { ConfirmDeleteDialog } from '@/shared/admin-ui/dialogs';
import { FormSection } from '@/shared/admin-ui/form-section';
import { SortableList } from '@/shared/admin-ui/sortable-list';
import { resolveLocalized } from '@/shared/i18n/localized';
import { Button } from '@/shared/ui/primitives/button';

import { deleteSponsor, reorderSponsors } from '../../actions/admin-partners';
import { type SponsorStatus, sponsorStatus } from '../../domain/sponsor-status';
import type { Sponsor, SponsorTier } from '../../types';
import { SponsorDialog } from './sponsor-dialog';

const STATUS_TONE: Record<SponsorStatus, AdminBadgeTone> = {
  active: 'dark',
  past: 'neutral',
  scheduled: 'outline',
  inactive: 'muted',
};

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

type Props = {
  tiers: SponsorTier[];
  sponsors: Sponsor[];
  media: Record<string, MediaItem>;
  /** Today in Skopje, "2026-10-14": decides which sponsors are active or past. */
  today: string;
  canEdit: boolean;
};

/** Admin › Pages › Sponsors › Sponsors: the logos of every tier, in the order the site shows them. */
export function SponsorsTab({ tiers, sponsors, media: initialMedia, today, canEdit }: Props) {
  const t = useTranslations('admin.partners.sponsors');
  const tStatus = useTranslations('admin.partners.status');
  const tErrors = useTranslations('admin.partners.errors');
  const [media, setMedia] = React.useState(initialMedia);
  const [editing, setEditing] = React.useState<{
    sponsor: Sponsor | null;
    tierId: string;
    key: number;
  } | null>(null);
  const [toDelete, setToDelete] = React.useState<Sponsor | null>(null);
  const [, startTransition] = React.useTransition();
  const [optimistic, move] = React.useOptimistic(
    sponsors,
    (current, order: { tierId: string; ids: string[] }) => {
      const byId = new Map(current.map((sponsor) => [sponsor.id, sponsor]));
      let next = 0;
      return current.map((sponsor) =>
        sponsor.tierId === order.tierId ? byId.get(order.ids[next++]!)! : sponsor,
      );
    },
  );
  const addMedia = React.useCallback(
    (item: MediaItem) => setMedia((current) => ({ ...current, [item.id]: item })),
    [],
  );

  const open = (sponsor: Sponsor | null, tierId: string) =>
    setEditing((current) => ({ sponsor, tierId, key: (current?.key ?? 0) + 1 }));

  const reorder = (tierId: string, items: Sponsor[]) => {
    const ids = items.map((sponsor) => sponsor.id);
    startTransition(async () => {
      move({ tierId, ids });
      const result = await reorderSponsors({ tierId, ids });
      if (!result.ok) toast.error(tErrors(result.error === 'forbidden' ? 'forbidden' : 'unexpected'));
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-md bg-surface px-4 py-3 text-small text-ink-2">{t('hint')}</p>
      {tiers.map((tier) => {
        const inTier = optimistic.filter((sponsor) => sponsor.tierId === tier.id);
        const visible = inTier.filter((sponsor) => sponsorStatus(sponsor, today) === 'active').length;
        return (
          <FormSection
            key={tier.id}
            id={`tier-${tier.id}`}
            title={resolveLocalized(tier.name, 'en')}
            aside={t('inTier', { count: inTier.length, visible })}
          >
            {inTier.length === 0 ? (
              <p className="rounded-md border border-dashed border-line-strong bg-surface px-4 py-4 text-small text-muted-ink">
                {t('emptyText')}
              </p>
            ) : (
              <SortableList
                label={t('list', { tier: resolveLocalized(tier.name, 'en') })}
                items={inTier}
                itemName={(sponsor) => sponsor.name}
                onReorder={(items) => reorder(tier.id, items)}
                className="flex flex-col gap-2"
                renderItem={(sponsor, handle) => {
                  const status = sponsorStatus(sponsor, today);
                  const logo = sponsor.logo ? media[sponsor.logo.mediaId] : undefined;
                  return (
                    <div className="grid grid-cols-[32px_64px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-line p-2.5">
                      {canEdit ? <span className="flex items-center">{handle}</span> : <span />}
                      <span className="relative block h-10 w-16 overflow-hidden rounded-sm border border-divider bg-white">
                        {logo ? <MediaThumb item={logo} sizes="64px" decorative /> : null}
                      </span>
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <strong className="font-medium">{sponsor.name}</strong>
                          <AdminBadge tone={STATUS_TONE[status]}>
                            {status === 'scheduled'
                              ? tStatus('scheduled', { date: sponsor.activeFrom })
                              : tStatus(status)}
                          </AdminBadge>
                        </span>
                        <span className="truncate text-[13px] text-muted-ink">
                          {host(sponsor.websiteUrl) || t('noWebsite')}
                          {!sponsor.logo && ` · ${t('textOnly')}`}
                        </span>
                      </span>
                      {canEdit && (
                        <span className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 text-muted-ink"
                            aria-label={t('edit', { name: sponsor.name })}
                            onClick={() => open(sponsor, tier.id)}
                          >
                            <Pencil aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 text-muted-ink"
                            aria-label={t('delete', { name: sponsor.name })}
                            onClick={() => setToDelete(sponsor)}
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        </span>
                      )}
                    </div>
                  );
                }}
              />
            )}
            {canEdit && (
              <div>
                <Button variant="quiet" size="sm" onClick={() => open(null, tier.id)}>
                  <Plus aria-hidden />
                  {t('add', { tier: resolveLocalized(tier.name, 'en') })}
                </Button>
              </div>
            )}
          </FormSection>
        );
      })}

      {editing && (
        <SponsorDialog
          key={editing.key}
          sponsor={editing.sponsor}
          tiers={tiers}
          defaultTierId={editing.tierId}
          media={media}
          addMedia={addMedia}
          open
          onOpenChange={(next) => !next && setEditing(null)}
        />
      )}

      <ConfirmDeleteDialog
        open={toDelete !== null}
        onOpenChange={(next) => !next && setToDelete(null)}
        title={t('deleteTitle', { name: toDelete?.name ?? '' })}
        description={t('deleteText')}
        confirmLabel={t('deleteConfirm')}
        onConfirm={async () => {
          const result = await deleteSponsor(toDelete?.id);
          if (!result.ok) {
            toast.error(tErrors(result.error === 'forbidden' ? 'forbidden' : 'unexpected'));
            return;
          }
          setToDelete(null);
          toast.success(t('deleted'));
        }}
      />
    </div>
  );
}
