'use client';

import { ArrowUpRight, List, Map as MapIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import type { Locale } from '@/shared/i18n/routing';
import { cn } from '@/shared/lib/cn';
import { Chip, FilterToggle } from '@/shared/ui/chip';
import { LeafletMap, type MapPin } from '@/shared/ui/map/leaflet-map';

import type { CommitteeStatus, PublicCommittee } from '../types';

// The committee map of Home (CommitteeMap, Home-Desktop, Home-Mobile): a filter, a Map / List
// switch, the map with its legend and popup, and the same committees as a plain list. The list is
// not a fallback for broken JavaScript only: it is how screen-reader and keyboard users can read
// every committee without tabbing through 35 pins.

/** What Leaflet shows first: Europe, from Lisbon to Kharkiv and from Tallinn to Athens. */
const EUROPE: [[number, number], [number, number]] = [
  [34.5, -11],
  [65.5, 41],
];

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

function pinFor(committee: PublicCommittee): Pick<MapPin, 'tone' | 'size' | 'compactSize' | 'raised'> {
  if (committee.isHome) return { tone: 'brand', size: 22, compactSize: 14, raised: true };
  if (committee.status === 'jlc') return { tone: 'dark', size: 9, compactSize: 6 };
  return { tone: committee.status === 'observer' ? 'hollow' : 'dark', size: 13, compactSize: 8 };
}

export function CommitteeNetwork({
  committees,
  className,
}: {
  committees: PublicCommittee[];
  className?: string;
}) {
  const t = useTranslations('committees');
  const locale = useLocale();
  const home = committees.find((committee) => committee.isHome) ?? null;
  const [filter, setFilter] = React.useState<'all' | CommitteeStatus>('all');
  const [view, setView] = React.useState<'map' | 'list'>('map');
  const [selectedId, setSelectedId] = React.useState<string | null>(home?.id ?? null);
  const [compact, setCompact] = React.useState(false);
  const afterMap = React.useId();

  const counts = {
    all: committees.length,
    lc: committees.filter((committee) => committee.status === 'lc').length,
    observer: committees.filter((committee) => committee.status === 'observer').length,
    jlc: committees.filter((committee) => committee.status === 'jlc').length,
  };
  const shown = filter === 'all' ? committees : committees.filter((committee) => committee.status === filter);
  const pins: MapPin[] = React.useMemo(
    () =>
      (filter === 'all' ? committees : committees.filter((committee) => committee.status === filter)).map(
        (committee) => ({
          id: committee.id,
          lat: committee.lat,
          lng: committee.lng,
          label: t('map.pin', {
            name: committee.name,
            country: committee.countryName,
            status: t(`status.${committee.status}`),
          }),
          ...pinFor(committee),
        }),
      ),
    [committees, filter, t],
  );
  const selected = shown.find((committee) => committee.id === selectedId) ?? null;
  // Phones show the selection under the map instead of a popup (Home-Mobile).
  const summary = selected ?? (home && shown.some((committee) => committee.id === home.id) ? home : null);

  const filters = (['all', 'lc', 'observer', 'jlc'] as const).map((value) => (
    <FilterToggle key={value} pressed={filter === value} onClick={() => setFilter(value)}>
      {value === 'lc' && compact
        ? t('filters.lcShort', { count: counts.lc })
        : t(`filters.${value}`, { count: counts[value] })}
    </FilterToggle>
  ));

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div
          role="group"
          aria-label={t('filters.label')}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
        >
          {filters}
        </div>
        <div
          role="group"
          aria-label={t('view.label')}
          className="inline-flex shrink-0 rounded-sm border border-line-strong bg-white p-0.5"
        >
          {(['map', 'list'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={cn(
                'flex h-10 cursor-pointer items-center gap-2 rounded-[6px] px-4 text-small font-medium',
                'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand',
                view === value ? 'bg-ink text-white' : 'text-ink hover:bg-surface',
              )}
            >
              {value === 'map' ? (
                <MapIcon className="size-4" aria-hidden />
              ) : (
                <List className="size-4" aria-hidden />
              )}
              {t(`view.${value}`)}
            </button>
          ))}
        </div>
      </div>

      {view === 'map' ? (
        <>
          <a
            href={`#${afterMap}`}
            className="sr-only rounded-sm bg-white px-3 py-2 text-small font-medium text-brand-dark focus:not-sr-only focus:self-start focus-visible:outline-3 focus-visible:outline-brand"
          >
            {t('map.skip')}
          </a>
          <LeafletMap
            pins={pins}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
            onCompactChange={setCompact}
            bounds={EUROPE}
            popup={(pin) => {
              const committee = shown.find((item) => item.id === pin.id);
              return committee ? <CommitteeCard committee={committee} popup /> : null;
            }}
            labels={{
              map: t('map.label'),
              zoomIn: t('map.zoomIn'),
              zoomOut: t('map.zoomOut'),
              loading: t('map.loading'),
              close: t('map.close'),
            }}
          >
            {!compact && <Legend home={home} />}
          </LeafletMap>
          {compact && (
            <>
              {summary && (
                <section
                  aria-label={t('map.summary')}
                  className="flex items-center gap-3.5 rounded-md bg-white p-4 shadow-card"
                >
                  <CommitteeCard committee={summary} />
                </section>
              )}
              <CompactLegend />
            </>
          )}
          <span id={afterMap} tabIndex={-1} className="-mt-5 block h-0 outline-none" />
        </>
      ) : (
        <CommitteeList committees={shown} locale={locale} />
      )}
    </div>
  );
}

/** Name, place, type and website of a committee: the popup on desktop, the card under the map on phones. */
function CommitteeCard({ committee, popup }: { committee: PublicCommittee; popup?: boolean }) {
  const t = useTranslations('committees');
  const place = t('map.place', { city: committee.city, country: committee.countryName });
  const link = committee.url && (
    <a
      href={committee.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-small font-medium text-brand-dark underline-offset-2 hover:underline"
    >
      {t('map.visit', { host: hostOf(committee.url) })}
      <span className="sr-only"> {t('map.newTab')}</span>
    </a>
  );
  if (popup)
    return (
      <>
        <div className="flex flex-col gap-0.5 pr-7">
          <span className="text-[18px] leading-[1.3] font-bold">{committee.name}</span>
          <span className="text-small text-muted-ink">{place}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <Chip size="sm">{t(`status.${committee.status}`)}</Chip>
          {link}
        </div>
      </>
    );
  return (
    <>
      <span
        aria-hidden
        className={cn(
          'size-4 shrink-0 rounded-full border-[3px] border-white',
          committee.isHome
            ? 'bg-brand shadow-[0_0_0_1px_var(--color-brand)]'
            : 'bg-ink-2 shadow-[0_0_0_1px_var(--color-ink-2)]',
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <strong className="text-[16px]">{committee.name}</strong>
        <span className="text-small text-muted-ink">
          {place} · {t(`status.${committee.status}`)}
        </span>
      </div>
      {committee.url && (
        <a
          href={committee.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('map.visit', { host: hostOf(committee.url) })}
          className="flex size-11 shrink-0 items-center justify-center rounded-sm text-brand-dark hover:bg-surface focus-visible:outline-3 focus-visible:outline-brand"
        >
          <ArrowUpRight className="size-5" aria-hidden />
          <span className="sr-only">{t('map.newTab')}</span>
        </a>
      )}
    </>
  );
}

function Swatch({ tone }: { tone: 'home' | 'lc' | 'observer' | 'jlc' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block shrink-0 rounded-full',
        tone === 'home' &&
          'mx-px size-3.5 border-2 border-white bg-brand shadow-[0_0_0_1px_var(--color-brand)]',
        tone === 'lc' && 'mx-px size-3 bg-ink-2',
        tone === 'observer' && 'mx-px size-3 border-[2.5px] border-ink-2 bg-white',
        tone === 'jlc' && 'mx-[3px] size-2 bg-ink-2',
      )}
    />
  );
}

function Legend({ home }: { home: PublicCommittee | null }) {
  const t = useTranslations('committees.legend');
  return (
    <ul
      aria-label={t('title')}
      className="absolute bottom-4 left-4 z-[900] m-0 flex list-none flex-col gap-2 rounded-md bg-white p-0 px-4 py-3.5 text-[13px] shadow-[0_1px_4px_rgb(0_0_0/0.15)]"
    >
      {home && (
        <li className="flex items-center gap-2.5">
          <Swatch tone="home" />
          {home.name}
        </li>
      )}
      {(['lc', 'observer', 'jlc'] as const).map((tone) => (
        <li key={tone} className="flex items-center gap-2.5">
          <Swatch tone={tone} />
          {t(tone)}
        </li>
      ))}
    </ul>
  );
}

/** The phone legend: one line under the map (Home-Mobile). */
function CompactLegend() {
  const t = useTranslations('committees.legend');
  return (
    <ul
      aria-label={t('title')}
      className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-small text-muted-ink"
    >
      {(['lc', 'observer', 'jlc'] as const).map((tone) => (
        <li key={tone} className="flex items-center gap-1.5">
          <Swatch tone={tone} />
          {t(tone)}
        </li>
      ))}
    </ul>
  );
}

/** Every committee as text, by country (the List view). */
function CommitteeList({ committees, locale }: { committees: PublicCommittee[]; locale: Locale }) {
  const t = useTranslations('committees');
  const collator = new Intl.Collator(locale);
  const rows = [...committees].sort(
    (a, b) => collator.compare(a.countryName, b.countryName) || collator.compare(a.name, b.name),
  );
  return (
    <section aria-label={t('list.label')} className="flex flex-col gap-3">
      <p role="status" className="text-small text-muted-ink">
        {t('list.count', { count: rows.length })}
      </p>
      <ul className="m-0 grid list-none gap-2.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((committee) => (
          <li
            key={committee.id}
            className={cn(
              'flex flex-col gap-1.5 rounded-md border bg-white p-4',
              committee.isHome ? 'border-brand' : 'border-line',
            )}
          >
            <span className="flex flex-wrap items-center gap-2">
              <strong className="text-[16px]">{committee.name}</strong>
              {committee.isHome && (
                <Chip size="sm" tone="red">
                  {t('list.ours')}
                </Chip>
              )}
            </span>
            <span className="text-small text-muted-ink">
              {committee.city}, {committee.countryName}
            </span>
            <span className="flex flex-wrap items-center justify-between gap-2">
              <Chip size="sm" tone="outline">
                {t(`status.${committee.status}`)}
              </Chip>
              {committee.url && (
                <a
                  href={committee.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-small font-medium text-brand-dark underline-offset-2 hover:underline"
                >
                  {t('map.visit', { host: hostOf(committee.url) })}
                  <span className="sr-only"> {t('map.newTab')}</span>
                </a>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
