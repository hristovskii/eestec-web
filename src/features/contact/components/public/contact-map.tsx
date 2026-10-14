'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import { LeafletMap, type MapPin } from '@/shared/ui/map/leaflet-map';
import { Container } from '@/shared/ui/container';
import { Button } from '@/shared/ui/primitives/button';

import type { PublicContact } from '../../types';

const noSelection = () => undefined;

/** "How to find us": one map with one pin, the place card on it (desktop) or under it (phones), and the links to a map app. */
export function ContactMap({ page }: { page: PublicContact }) {
  const t = useTranslations('contact.map');
  const { map } = page;
  const pins = React.useMemo<MapPin[]>(
    () => [
      {
        id: 'office',
        lat: map.lat,
        lng: map.lng,
        label: map.pinLabel || map.placeName,
        tone: 'brand',
        size: 22,
        compactSize: 18,
        raised: true,
      },
    ],
    [map],
  );
  const center = React.useMemo(() => ({ lat: map.lat, lng: map.lng, zoom: map.zoom }), [map]);
  const open = `https://www.google.com/maps/search/?api=1&query=${map.lat},${map.lng}`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${map.lat},${map.lng}`;

  const place = (
    <div className="flex flex-col gap-0.5">
      <strong className="text-[16px] lg:text-[17px]">{map.placeName}</strong>
      {map.placeAddress && <span className="text-small text-muted-ink">{map.placeAddress}</span>}
    </div>
  );

  return (
    <section aria-labelledby="contact-map-title">
      <Container className="flex flex-col gap-3.5 pb-10 lg:gap-5 lg:pb-18">
        <h2
          id="contact-map-title"
          className="text-[22px] leading-[1.3] font-bold lg:text-[28px] lg:leading-[1.25]"
        >
          {page.headings.map}
        </h2>
        <LeafletMap
          pins={pins}
          selectedId={null}
          onSelect={noSelection}
          center={center}
          maxZoom={18}
          pinLabels
          className="aspect-auto h-60 rounded-lg lg:aspect-[1200/480] lg:h-auto"
          labels={{
            map: t('label', { place: map.placeName }),
            zoomIn: t('zoomIn'),
            zoomOut: t('zoomOut'),
            loading: t('loading'),
            close: t('close'),
          }}
        >
          <div className="absolute bottom-6 left-6 z-[600] hidden w-[340px] flex-col gap-3 rounded-[14px] bg-white p-5 shadow-[0_12px_32px_rgb(0_0_0/0.16)] lg:flex">
            {place}
            <div className="flex items-center gap-2.5">
              <Button asChild size="sm">
                <a href={directions} target="_blank" rel="noopener noreferrer">
                  {t('directions')}
                  <span className="sr-only"> {t('newTab')}</span>
                </a>
              </Button>
              <a
                href={open}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-small font-medium text-brand-dark no-underline hover:underline"
              >
                {t('open')}
                <span className="sr-only"> {t('newTab')}</span>
              </a>
            </div>
          </div>
        </LeafletMap>
        <div className="flex flex-col gap-3.5 lg:hidden">
          {place}
          <Button asChild block>
            <a href={directions} target="_blank" rel="noopener noreferrer">
              {t('directions')}
              <span className="sr-only"> {t('newTab')}</span>
            </a>
          </Button>
        </div>
      </Container>
    </section>
  );
}
