'use client';

import 'leaflet/dist/leaflet.css';

import type * as Leaflet from 'leaflet';
import * as React from 'react';

import { MAP_TILES } from '@/shared/config/map';
import { cn } from '@/shared/lib/cn';

// The one map component (docs/ARCHITECTURE.md §9): Leaflet + the tile provider of
// shared/config/map.ts. Loaded in the browser only (Leaflet needs `window`), so the page renders
// a placeholder first and the build needs nothing from the environment. Pins are drawn as styled
// <div> icons, never Leaflet's default marker images. Used by the committee map (Home) and, with
// one pin, by Contact (D16).

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  /** Announced by screen readers and shown as the tooltip: "LC Belgrade — Serbia, Local Committee". */
  label: string;
  /** brand: the highlighted pin (red, white ring, halo); dark: filled; hollow: white with a dark ring. */
  tone: 'brand' | 'dark' | 'hollow';
  /** Pin diameter in px, and on small maps. */
  size: number;
  compactSize?: number;
  /** Drawn above the others (the highlighted pin). */
  raised?: boolean;
};

export type MapLabels = {
  /** Name of the map region ("Map of EESTEC committees"). */
  map: string;
  zoomIn: string;
  zoomOut: string;
  loading: string;
  /** Name of the popup dialog's close button. */
  close: string;
};

type LeafletMapProps = {
  pins: readonly MapPin[];
  selectedId: string | null;
  /** A pin was chosen (click or Enter), or the popup was closed (null). */
  onSelect: (id: string | null) => void;
  /** Content of the popup of the selected pin; none: no popup. */
  popup?: (pin: MapPin) => React.ReactNode;
  /** Visible area to start with: [[south, west], [north, east]]. */
  bounds?: [[number, number], [number, number]];
  /** Instead of bounds: one place (Contact). */
  center?: { lat: number; lng: number; zoom: number };
  /** The map is small (a phone): smaller pins, no popup (the page shows the selection itself). */
  onCompactChange?: (compact: boolean) => void;
  labels: MapLabels;
  /** Overlays such as the legend; position them with absolute classes. */
  children?: React.ReactNode;
  className?: string;
};

const COMPACT_BELOW = 720;
const POPUP_GAP = 22;

/** Diameter and ring width of a pin, as designed (CommitteeMap: 13 px dark with a 2 px white ring…). */
function pinShape(pin: MapPin, compact: boolean) {
  const size = compact ? (pin.compactSize ?? pin.size) : pin.size;
  const border = pin.tone === 'hollow' ? (compact ? 2 : 2.5) : pin.tone === 'brand' ? 3 : compact ? 1 : 2;
  return { size, border };
}

export function LeafletMap({
  pins,
  selectedId,
  onSelect,
  popup,
  bounds,
  center,
  onCompactChange,
  labels,
  children,
  className,
}: LeafletMapProps) {
  const frame = React.useRef<HTMLDivElement>(null);
  const target = React.useRef<HTMLDivElement>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);
  const [ready, setReady] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [compact, setCompact] = React.useState(false);
  const [point, setPoint] = React.useState<{ x: number; y: number } | null>(null);

  const library = React.useRef<typeof Leaflet | null>(null);
  const map = React.useRef<Leaflet.Map | null>(null);
  const markers = React.useRef(new Map<string, Leaflet.Marker>());
  /** Re-reads where the selected pin is on screen (set when the map exists). */
  const follow = React.useRef<() => void>(() => undefined);
  // The user chose a pin (not the page): the popup may take focus.
  const focusPopup = React.useRef(false);
  const latest = React.useRef({ pins, selectedId, onSelect, labels, compact });
  React.useEffect(() => {
    latest.current = { pins, selectedId, onSelect, labels, compact };
  });

  const selected = pins.find((pin) => pin.id === selectedId) ?? null;

  // Create the map once, in the browser.
  React.useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    const markersAtStart = markers.current;

    void import('leaflet')
      .then((module) => {
        if (cancelled || !target.current) return;
        const L = module.default ?? module;
        library.current = L;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const instance = L.map(target.current, {
          zoomControl: false,
          attributionControl: false,
          zoomSnap: 0.25,
          minZoom: 2,
          maxZoom: 12,
          worldCopyJump: false,
          zoomAnimation: !reduced,
          fadeAnimation: !reduced,
          markerZoomAnimation: !reduced,
        });
        map.current = instance;
        L.tileLayer(MAP_TILES.url, {
          attribution: MAP_TILES.attribution,
          maxZoom: MAP_TILES.maxZoom,
          className: 'map-tiles',
        }).addTo(instance);
        L.control.attribution({ prefix: '<a href="https://leafletjs.com">Leaflet</a>' }).addTo(instance);
        L.control
          .zoom({
            position: 'topleft',
            zoomInTitle: latest.current.labels.zoomIn,
            zoomOutTitle: latest.current.labels.zoomOut,
          })
          .addTo(instance);

        if (center) instance.setView([center.lat, center.lng], center.zoom);
        else if (bounds) instance.fitBounds(bounds);
        else instance.setView([50, 15], 4);

        // Where the selected pin is on screen (the popup follows the map).
        follow.current = () => {
          const current = latest.current.pins.find((pin) => pin.id === latest.current.selectedId);
          if (!current) return setPoint(null);
          const p = instance.latLngToContainerPoint([current.lat, current.lng]);
          setPoint({ x: p.x, y: p.y });
        };
        instance.on('move zoom resize', () => follow.current());
        instance.on('click', () => latest.current.onSelect(null));

        const container = frame.current;
        if (container) {
          observer = new ResizeObserver(([entry]) => {
            if (!entry) return;
            instance.invalidateSize();
            const next = entry.contentRect.width < COMPACT_BELOW;
            setCompact((current) => (current === next ? current : next));
          });
          observer.observe(container);
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      observer?.disconnect();
      map.current?.remove();
      map.current = null;
      markersAtStart.clear();
      setReady(false);
    };
    // The map is created once; pins, selection and labels reach it through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => onCompactChange?.(compact), [compact, onCompactChange]);

  // Pins: add, update and remove markers to match `pins` (filters change them).
  React.useEffect(() => {
    const L = library.current;
    const instance = map.current;
    if (!ready || !L || !instance) return;
    const wanted = new Set(pins.map((pin) => pin.id));
    for (const [id, marker] of markers.current)
      if (!wanted.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    for (const pin of pins) {
      const { size, border } = pinShape(pin, compact);
      const isSelected = pin.id === selectedId;
      const halo = pin.tone === 'brand' ? Math.round(size * 2.2) : 0;
      const box = Math.max(size, halo);
      const icon = L.divIcon({
        className: 'map-pin',
        iconSize: [box, box],
        iconAnchor: [box / 2, box / 2],
        html: `${halo ? `<span class="map-pin__halo" style="width:${halo}px;height:${halo}px"></span>` : ''}<span class="map-pin__dot map-pin__dot--${pin.tone}${isSelected ? ' is-selected' : ''}" style="width:${size}px;height:${size}px;border-width:${border}px"></span>`,
      });
      let marker = markers.current.get(pin.id);
      if (!marker) {
        marker = L.marker([pin.lat, pin.lng], {
          icon,
          keyboard: true,
          title: pin.label,
          riseOnHover: true,
          zIndexOffset: pin.raised ? 1000 : 0,
        });
        marker.on('click', (event) => {
          L.DomEvent.stopPropagation(event);
          focusPopup.current = true;
          latest.current.onSelect(pin.id);
        });
        marker.addTo(instance);
        markers.current.set(pin.id, marker);
      } else {
        marker.setIcon(icon);
        marker.setLatLng([pin.lat, pin.lng]);
        marker.setZIndexOffset(pin.raised ? 1000 : 0);
      }
      // Every pin is a button with a name (Leaflet adds role and tabindex for keyboard pins).
      const element = marker.getElement();
      element?.setAttribute('aria-label', pin.label);
      element?.setAttribute('data-pin-id', pin.id);
      element?.setAttribute('aria-haspopup', 'dialog');
    }
  }, [ready, pins, compact, selectedId]);

  // The popup sits above the selected pin: keep it in view, and follow it.
  React.useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    if (!selected) return;
    follow.current();
    if (popup && !compact) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      instance.panInside([selected.lat, selected.lng], {
        paddingTopLeft: [140, 190],
        paddingBottomRight: [140, 50],
        animate: !reduced,
      });
    }
  }, [ready, selected, compact, popup]);

  // A pin chosen with the keyboard or mouse hands focus to its popup.
  React.useEffect(() => {
    if (popupRef.current && focusPopup.current) {
      focusPopup.current = false;
      popupRef.current.focus();
    }
  });

  const close = () => {
    const id = latest.current.selectedId;
    latest.current.onSelect(null);
    // Back to the pin that opened it.
    if (id) requestAnimationFrame(() => markers.current.get(id)?.getElement()?.focus());
  };

  return (
    <div
      ref={frame}
      role="region"
      aria-label={labels.map}
      className={cn(
        'relative aspect-[1200/910] w-full overflow-hidden rounded-md border border-line bg-surface',
        className,
      )}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && latest.current.selectedId) {
          event.stopPropagation();
          close();
          return;
        }
        // Enter or Space on a pin opens it. Leaflet only listens for the old `keypress` event,
        // which not every browser or tool sends, so the pins handle the keys themselves.
        const pinId = (event.target as HTMLElement).closest?.('[data-pin-id]')?.getAttribute('data-pin-id');
        if (pinId && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          focusPopup.current = true;
          latest.current.onSelect(pinId);
        }
      }}
    >
      <div ref={target} className="absolute inset-0 z-0" />
      {!ready && (
        <p
          role="status"
          className="absolute inset-0 z-[500] flex items-center justify-center text-small text-muted-ink"
        >
          {failed ? '' : labels.loading}
        </p>
      )}
      {children}
      {ready && popup && !compact && selected && point && (
        <div
          ref={popupRef}
          role="dialog"
          aria-label={selected.label}
          tabIndex={-1}
          className="absolute z-[1000] w-[260px] rounded-md bg-white p-4 pb-3.5 shadow-[0_8px_28px_rgb(0_0_0/0.18)] outline-none focus-visible:outline-3 focus-visible:outline-brand"
          style={{ left: point.x, top: point.y - POPUP_GAP, transform: 'translate(-50%, -100%)' }}
        >
          {popup(selected)}
          <button
            type="button"
            onClick={close}
            aria-label={labels.close}
            className="absolute top-2.5 right-2.5 flex size-8 cursor-pointer items-center justify-center rounded-sm text-muted-ink hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <span
            aria-hidden
            className="absolute bottom-[-7px] left-1/2 size-3.5 -translate-x-1/2 rotate-45 bg-white shadow-[3px_3px_6px_rgb(0_0_0/0.06)]"
          />
        </div>
      )}
    </div>
  );
}
