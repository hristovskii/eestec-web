'use client';

import { FolderOpen, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { AdminBadge, AdminPage, AdminPageHeader, AdminTabs, TablePanel } from '@/shared/admin-ui/admin-page';
import { FilterBar, SelectFilter } from '@/shared/admin-ui/filter-bar';
import { TablePagination } from '@/shared/admin-ui/table-pagination';
import { useUrlParams } from '@/shared/admin-ui/use-url-params';
import type { Paged } from '@/shared/data/paged';
import { EmptyState } from '@/shared/ui/empty-state';
import { Notice } from '@/shared/ui/notice';
import { Button } from '@/shared/ui/primitives/button';
import { Sheet } from '@/shared/ui/primitives/sheet';

import { formatBytes, needsAlt } from '../../domain/upload-rules';
import { MEDIA_PAGE_SIZES, type MediaListParams } from '../../schemas/media.schema';
import type { MediaCounts, MediaItem } from '../../types';
import { MediaDetails } from './media-details';
import { MediaThumb } from './media-thumb';
import { UploadDialog } from './upload-dialog';

type MediaLibraryProps = {
  page: Paged<MediaItem> & { counts: MediaCounts };
  params: MediaListParams;
  currentUserId: string;
  /** 'own': event managers (D18) see and change only their own uploads. */
  access: 'full' | 'own';
  canUpload: boolean;
};

/** /admin/media: every file the site uses, with alt text, credit and uploads. */
export function MediaLibrary({ page, params, currentUserId, access, canUpload }: MediaLibraryProps) {
  const t = useTranslations('admin.media');
  const { hrefWith, update } = useUrlParams();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const selected = page.items.find((item) => item.id === selectedId) ?? null;
  const filtered = Boolean(params.q || params.alt || params.mine || params.kind);

  const tab = (kind: 'image' | 'document' | null, label: string, count: number) => ({
    href: hrefWith({ kind }),
    label,
    count,
    current: (params.kind ?? null) === kind,
  });

  return (
    <AdminPage>
      <AdminPageHeader
        title={t('title')}
        description={access === 'own' ? t('descriptionOwn') : t('description')}
        actions={
          canUpload && (
            <Button size="sm" onClick={() => setUploading(true)}>
              <Upload aria-hidden />
              {t('upload')}
            </Button>
          )
        }
      />

      {page.counts.missingAlt > 0 && params.alt !== 'missing' && (
        // Calm grey notice: the red count is on the cards themselves ("No alt text").
        <Notice
          tone="info"
          actions={
            <Button variant="quiet" size="sm" onClick={() => update({ alt: 'missing', kind: 'image' })}>
              {t('showMissing')}
            </Button>
          }
        >
          {t('missingNotice', { count: page.counts.missingAlt })}
        </Notice>
      )}

      <TablePanel>
        <AdminTabs
          label={t('tabs.label')}
          tabs={[
            tab(null, t('tabs.all'), page.counts.all),
            tab('image', t('tabs.image'), page.counts.image),
            tab('document', t('tabs.document'), page.counts.document),
          ]}
        />
        <FilterBar
          search={{ param: 'q', label: t('filters.search'), placeholder: t('filters.searchPlaceholder') }}
          filterParams={access === 'own' ? ['alt'] : ['alt', 'mine']}
        >
          <SelectFilter
            param="alt"
            label={t('filters.alt')}
            anyLabel={t('filters.altAny')}
            width="170px"
            options={[{ value: 'missing', label: t('filters.altMissing') }]}
          />
          {access === 'full' && (
            <SelectFilter
              param="mine"
              label={t('filters.uploader')}
              anyLabel={t('filters.uploaderAny')}
              width="140px"
              options={[{ value: '1', label: t('filters.uploaderMe') }]}
            />
          )}
          <SelectFilter
            param="sort"
            label={t('filters.sort')}
            anyLabel={t('filters.sortNewest')}
            width="150px"
            options={[
              { value: 'oldest', label: t('filters.sortOldest') },
              { value: 'name', label: t('filters.sortName') },
            ]}
          />
        </FilterBar>

        {page.items.length === 0 ? (
          <EmptyState
            variant="admin"
            icon={filtered ? undefined : <FolderOpen />}
            title={filtered ? t('empty.filteredTitle') : t('empty.noneTitle')}
            actions={
              filtered ? (
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => update({ q: null, alt: null, mine: null, kind: null })}
                >
                  {t('empty.clear')}
                </Button>
              ) : (
                canUpload && (
                  <Button size="sm" onClick={() => setUploading(true)}>
                    <Upload aria-hidden />
                    {t('upload')}
                  </Button>
                )
              )
            }
          >
            {filtered ? t('empty.filteredText') : t('empty.noneText')}
          </EmptyState>
        ) : (
          <ul
            aria-label={t('grid')}
            className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:p-5 lg:grid-cols-4 xl:grid-cols-6"
          >
            {page.items.map((item) => (
              <li key={item.id}>
                <MediaCard item={item} onOpen={() => setSelectedId(item.id)} />
              </li>
            ))}
          </ul>
        )}

        {page.total > 0 && (
          <TablePagination
            page={page.page}
            pageSize={page.pageSize}
            total={page.total}
            sizes={MEDIA_PAGE_SIZES}
            sizeLabel={t('grid')}
          />
        )}
      </TablePanel>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        {selected && (
          <MediaDetails
            key={selected.id}
            item={selected}
            editable={access === 'full' || selected.uploadedBy.userId === currentUserId}
            onDeleted={() => setSelectedId(null)}
          />
        )}
      </Sheet>
      {canUpload && <UploadDialog open={uploading} onOpenChange={setUploading} />}
    </AdminPage>
  );
}

function MediaCard({ item, onOpen }: { item: MediaItem; onOpen: () => void }) {
  const t = useTranslations('admin.media');
  const dimensions = item.width && item.height ? `${item.width} × ${item.height}` : null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full cursor-pointer flex-col overflow-hidden rounded-md border border-line bg-white text-left hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span className="relative block aspect-[4/3] border-b border-line">
        <MediaThumb item={item} decorative sizes="(min-width: 1280px) 180px, (min-width: 640px) 30vw, 45vw" />
        {(needsAlt(item) || item.alt === '') && (
          <span className="absolute top-2 left-2 flex flex-wrap gap-1">
            {needsAlt(item) && <AdminBadge tone="attention">{t('noAlt')}</AdminBadge>}
            {item.alt === '' && <AdminBadge tone="neutral">{t('decorative')}</AdminBadge>}
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 px-3 py-2.5">
        <span className="truncate text-small font-medium">{item.fileName}</span>
        <span className="truncate text-[12px] text-muted-ink">
          {dimensions ? t('meta', { dimensions, size: formatBytes(item.size) }) : formatBytes(item.size)}
        </span>
      </span>
    </button>
  );
}
