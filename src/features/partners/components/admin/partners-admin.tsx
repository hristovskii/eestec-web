'use client';

import { useTranslations } from 'next-intl';

import type { MediaItem } from '@/features/media';
import { AdminPage, AdminPageHeader, AdminTabs, TablePanel } from '@/shared/admin-ui/admin-page';

import type { PartnersPageRecord, PartnersTab, Sponsor, SponsorTier } from '../../types';
import { PartnersPageEditor } from './page-tab';
import { SponsorsTab } from './sponsors-tab';
import { TiersTab } from './tiers-tab';

type Props = {
  tab: PartnersTab;
  page: PartnersPageRecord;
  tiers: SponsorTier[];
  sponsors: Sponsor[];
  media: Record<string, MediaItem>;
  today: string;
  canEdit: boolean;
};

/** /admin/pages/sponsors (spec 09 › Admin-managed data): the page's texts, the sponsors and their tiers. */
export function PartnersAdmin({ tab, page, tiers, sponsors, media, today, canEdit }: Props) {
  const t = useTranslations('admin.partners');
  const href = (next: PartnersTab) =>
    next === 'page' ? '/admin/pages/sponsors' : `/admin/pages/sponsors?tab=${next}`;
  const tabs = (
    <TablePanel>
      <AdminTabs
        label={t('tabs.label')}
        tabs={[
          { href: href('page'), label: t('tabs.page'), current: tab === 'page' },
          {
            href: href('sponsors'),
            label: t('tabs.sponsors'),
            count: sponsors.length,
            current: tab === 'sponsors',
          },
          { href: href('tiers'), label: t('tabs.tiers'), count: tiers.length, current: tab === 'tiers' },
        ]}
      />
    </TablePanel>
  );

  if (tab === 'page') return <PartnersPageEditor record={page} media={media} canEdit={canEdit} tabs={tabs} />;

  return (
    <AdminPage>
      <AdminPageHeader
        title={t('title')}
        description={t(tab === 'sponsors' ? 'sponsorsDescription' : 'tiersDescription')}
      />
      {tabs}
      {tab === 'sponsors' ? (
        <SponsorsTab tiers={tiers} sponsors={sponsors} media={media} today={today} canEdit={canEdit} />
      ) : (
        <TiersTab tiers={tiers} sponsors={sponsors} canEdit={canEdit} />
      )}
    </AdminPage>
  );
}
