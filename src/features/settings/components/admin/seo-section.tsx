'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { MediaPicker } from '@/features/media/admin';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/primitives/button';

import { PHASE2_SEO_PAGES, SEO_PAGES, type SeoPageKey } from '../../types';
import { assetFrom } from './branding-events';
import { fieldId, type SectionProps, SettingsPanel } from './form-kit';

const PATHS: Record<SeoPageKey, string> = {
  home: '/',
  events: '/events',
  upcoming: '/upcoming',
  journey: '/journey',
  join: '/join',
  partners: '/partners',
  contact: '/contact',
  members: '/members',
  memories: '/memories',
  submit: '/submit',
  privacy: '/privacy',
};

const LIMITS = { title: 60, description: 160 } as const;

/** "Aim for 50–60 characters." with a length bar and "53 / 60" (AdminSettings › SEO). */
function LengthMeter({ length, max, aim }: { length: number; max: number; aim: string }) {
  const t = useTranslations('admin.settings.seo');
  const over = length > max;
  return (
    <span className="flex flex-col gap-1.5">
      <span aria-hidden className="block h-1 overflow-hidden rounded-full bg-divider">
        <span
          className={cn('block h-full', over ? 'bg-brand' : 'bg-ink')}
          style={{ width: `${Math.min(100, (length / max) * 100)}%` }}
        />
      </span>
      <span className="flex justify-between gap-2">
        <span>{aim}</span>
        <span className={cn('tabular-nums', over && 'font-medium text-brand-dark')}>
          {t('count', { count: length, max })}
        </span>
      </span>
    </span>
  );
}

export function SeoSection({
  values,
  update,
  error,
  phase2,
  siteName,
}: SectionProps & { phase2: boolean; siteName: string }) {
  const t = useTranslations('admin.settings.seo');
  const tSections = useTranslations('admin.settings.sections');
  const [open, setOpen] = React.useState<SeoPageKey | null>('home');
  const [picking, setPicking] = React.useState<SeoPageKey | null>(null);
  const pages = SEO_PAGES.filter((page) => phase2 || !PHASE2_SEO_PAGES.includes(page));

  // A page with an error opens, so its fields (and the summary links) are there.
  const pageWithError = pages.find(
    (page) => error(`seo.${page}.title.mk`) || error(`seo.${page}.description.mk`),
  );
  const [lastErrorPage, setLastErrorPage] = React.useState(pageWithError);
  if (pageWithError !== lastErrorPage) {
    setLastErrorPage(pageWithError);
    if (pageWithError) setOpen(pageWithError);
  }

  return (
    <SettingsPanel id="seo" title={tSections('seo')} aside={t('suffix', { siteName })} flush>
      <div className="hidden grid-cols-[150px_minmax(0,1fr)_170px_96px_72px] gap-3 border-b border-line bg-surface-2 px-5 py-2.5 text-[12px] font-medium tracking-[0.04em] text-muted-ink uppercase md:grid">
        <span>{t('page')}</span>
        <span>{t('pageTitle')}</span>
        <span>{t('pageDescription')}</span>
        <span>{t('shareImage')}</span>
        <span />
      </div>
      <ul className="m-0 list-none p-0">
        {pages.map((page) => {
          const seo = values.seo[page];
          const isOpen = open === page;
          const name = t(`pages.${page}`);
          const descriptionLength = seo.description.mk.length;
          return (
            <li
              key={page}
              className={cn('border-b border-divider last:border-b-0', isOpen && 'bg-surface-2')}
            >
              {isOpen ? (
                <div className="grid gap-4 p-4 md:grid-cols-[150px_minmax(0,1fr)] md:gap-3 md:px-5">
                  <span className="flex flex-col">
                    <strong className="font-bold">{name}</strong>
                    <span className="text-[13px] text-muted-ink">{PATHS[page]}</span>
                  </span>
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="flex flex-col gap-3.5">
                      <LocalizedField
                        id={fieldId(`seo.${page}.title`)}
                        label={t('pageTitle')}
                        value={seo.title}
                        onChange={(value) => update((draft) => void (draft.seo[page].title = value))}
                        error={error(`seo.${page}.title.mk`)}
                        help={
                          <LengthMeter length={seo.title.mk.length} max={LIMITS.title} aim={t('titleAim')} />
                        }
                      />
                      <LocalizedField
                        id={fieldId(`seo.${page}.description`)}
                        label={t('pageDescription')}
                        multiline
                        rows={3}
                        value={seo.description}
                        onChange={(value) => update((draft) => void (draft.seo[page].description = value))}
                        error={error(`seo.${page}.description.mk`)}
                        help={
                          <LengthMeter
                            length={descriptionLength}
                            max={LIMITS.description}
                            aim={t('descriptionAim')}
                          />
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2.5">
                      <span className="text-[13px] font-medium">{t('preview')}</span>
                      <div className="flex flex-col gap-1 rounded-md border border-line bg-white p-3.5">
                        <span className="text-[13px] text-muted-ink">
                          {`eestec.mk${page === 'home' ? '' : PATHS[page]}`}
                        </span>
                        <span className="text-[17px] leading-[1.3] font-medium">{seo.title.mk || name}</span>
                        <span className="line-clamp-3 text-[13px] leading-[1.45] text-muted-ink">
                          {seo.description.mk || t('missing')}
                        </span>
                      </div>
                      <span className="text-[13px] font-medium">{t('shareImageSize')}</span>
                      <div className="relative aspect-[1200/630] overflow-hidden rounded-sm border border-line bg-[repeating-linear-gradient(135deg,var(--color-divider)_0_10px,var(--color-line)_10px_20px)]">
                        {seo.shareImage && (
                          <Image src={seo.shareImage.src} alt="" fill unoptimized className="object-cover" />
                        )}
                      </div>
                      {!seo.shareImage && <span className="text-[13px] text-muted-ink">{t('noImage')}</span>}
                      <span className="flex flex-wrap gap-1.5">
                        <Button variant="quiet" size="sm" onClick={() => setPicking(page)}>
                          {t('choose')}
                        </Button>
                        {seo.shareImage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => update((draft) => void (draft.seo[page].shareImage = null))}
                          >
                            {t('remove')}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setOpen(null)}>
                          {t('done')}
                        </Button>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[150px_minmax(0,1fr)_170px_96px_72px] md:px-5">
                  <span className="flex flex-col">
                    <strong className="font-bold">{name}</strong>
                    <span className="text-[13px] text-muted-ink">{PATHS[page]}</span>
                  </span>
                  <span className="col-start-1 truncate md:col-start-auto">{seo.title.mk}</span>
                  <span
                    className={cn(
                      'col-start-1 flex items-center gap-1.5 text-[13px] md:col-start-auto',
                      descriptionLength ? 'text-ink' : 'font-medium text-brand-dark',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn('size-2 rounded-full', descriptionLength ? 'bg-ink' : 'bg-brand')}
                    />
                    {descriptionLength
                      ? t('count', { count: descriptionLength, max: LIMITS.description })
                      : t('missing')}
                  </span>
                  <span
                    className={cn(
                      'relative hidden h-[34px] w-16 overflow-hidden rounded-sm border border-line md:block',
                      'bg-[repeating-linear-gradient(135deg,var(--color-divider)_0_6px,var(--color-line)_6px_12px)]',
                      !seo.shareImage && 'opacity-35',
                    )}
                  >
                    {seo.shareImage && (
                      <Image src={seo.shareImage.src} alt="" fill unoptimized className="object-cover" />
                    )}
                  </span>
                  <Button
                    variant="quiet"
                    size="sm"
                    className="col-start-2 row-span-3 row-start-1 h-[30px] justify-self-end px-2.5 text-[13px] md:col-start-auto md:row-span-1 md:row-start-auto"
                    aria-label={`${t('edit')}: ${name}`}
                    onClick={() => setOpen(page)}
                  >
                    {t('edit')}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <MediaPicker
        open={picking !== null}
        onOpenChange={(next) => !next && setPicking(null)}
        currentId={picking ? values.seo[picking].shareImage?.mediaId : null}
        onPick={(item) => {
          if (!picking) return;
          update((draft) => void (draft.seo[picking].shareImage = assetFrom(item)));
        }}
      />
    </SettingsPanel>
  );
}
