import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/cn';

import { LOGO_CELLS, logoSize } from '../../domain/logo-size';
import type { PublicSponsor, TierSize } from '../../types';

/** Cell box per tier size: phone first, from 640 px the canvas's desktop cells (PartnerLogos). */
export const CELL_CLASSES: Record<TierSize, string> = {
  large: 'h-[120px] w-full sm:h-[140px] sm:w-[360px]',
  medium: 'h-[84px] w-[calc((100%-20px)/3)] sm:h-[112px] sm:w-[240px]',
  small: 'h-[72px] w-[calc((100%-20px)/3)] sm:h-[88px] sm:w-[176px]',
};

const CELL_BASE =
  'group relative flex items-center justify-center rounded-xl border border-divider bg-white text-center no-underline transition-[border-color,box-shadow] duration-200';

/** The smaller cell of the event page's "Event partners" panel (EventDetail: 64 px, 56 px on phones). */
const COMPACT = {
  mobile: { width: null, height: 56, maxWidth: 80, area: 1400 },
  desktop: { width: null, height: 64, maxWidth: 110, area: 2000 },
} as const;

type PartnerLogoProps = {
  sponsor: PublicSponsor;
  size: TierSize;
  /** The small cell of the event page. */
  compact?: boolean;
  /** Extra classes for the cell (the marquee fixes its width). */
  className?: string;
  /** A copy for the endless row: hidden from assistive technology and out of the tab order. */
  duplicate?: boolean;
};

/**
 * One partner (PartnerLogo): grey until hovered or focused, sized by visual area so a wide wordmark
 * and a square mark look equally big, opens the partner's website in a new tab. No logo: the name.
 * No website: not a link.
 */
export function PartnerLogo({ sponsor, size, compact, className, duplicate }: PartnerLogoProps) {
  const t = useTranslations('partners.logo');
  const { logo } = sponsor;
  const ratio = logo && logo.height > 0 ? logo.width / logo.height : 1;
  const desktop = logoSize(ratio, compact ? COMPACT.desktop : LOGO_CELLS.desktop[size]);
  const mobile = logoSize(ratio, compact ? COMPACT.mobile : LOGO_CELLS.mobile[size]);

  const content = logo ? (
    <Image
      src={logo.src}
      alt={duplicate ? '' : logo.alt}
      width={desktop.width}
      height={desktop.height}
      unoptimized
      style={
        {
          '--logo-w': `${mobile.width}px`,
          '--logo-h': `${mobile.height}px`,
          '--logo-dw': `${desktop.width}px`,
          '--logo-dh': `${desktop.height}px`,
        } as React.CSSProperties
      }
      className="block h-(--logo-h) w-(--logo-w) opacity-60 grayscale transition-[filter,opacity] duration-200 group-hover:opacity-100 group-hover:grayscale-0 group-focus-visible:opacity-100 group-focus-visible:grayscale-0 sm:h-(--logo-dh) sm:w-(--logo-dw)"
    />
  ) : (
    <strong className="px-2 text-[18px] tracking-[0.04em] text-ink-2">{sponsor.name}</strong>
  );

  const classes = cn(
    CELL_BASE,
    compact ? 'h-14 w-full lg:h-16' : CELL_CLASSES[size],
    sponsor.url &&
      'hover:border-line-strong hover:shadow-[0_6px_18px_rgb(0_0_0/0.08)] focus-visible:border-line-strong focus-visible:shadow-[0_6px_18px_rgb(0_0_0/0.08)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand',
    className,
  );

  if (!sponsor.url) return <div className={classes}>{content}</div>;
  return (
    <a
      href={sponsor.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('newTab', { name: sponsor.name })}
      {...(duplicate ? { tabIndex: -1, 'aria-hidden': true } : {})}
      className={classes}
    >
      {content}
    </a>
  );
}
