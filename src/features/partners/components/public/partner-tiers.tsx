import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/cn';

import type { PublicSponsor, PublicTier } from '../../types';
import { PartnerLogo } from './partner-logo';

/** The tier's name above its logos (PartnerLogos: small, uppercase, grey). */
export function TierHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="m-0 text-small font-medium tracking-[0.06em] text-muted-ink uppercase">{children}</h3>
  );
}

/** A plain grid of logos (never a carousel), centred; rows are as wide as the cells allow. */
export function LogoGrid({
  sponsors,
  size,
  label,
  className,
}: {
  sponsors: PublicSponsor[];
  size: PublicTier['size'];
  label: string;
  className?: string;
}) {
  return (
    <ul
      aria-label={label}
      className={cn('m-0 flex w-full list-none flex-wrap justify-center gap-2.5 p-0 sm:gap-4', className)}
    >
      {sponsors.map((sponsor) => (
        <li key={sponsor.id} className="contents">
          <PartnerLogo sponsor={sponsor} size={size} />
        </li>
      ))}
    </ul>
  );
}

/** /partners: every tier as a plain grid, in the board's order. Empty tiers never arrive here. */
export function PartnerWall({ tiers }: { tiers: PublicTier[] }) {
  return (
    <div className="flex w-full flex-col gap-7 lg:gap-9">
      {tiers.map((tier) => (
        <div key={tier.id} className="flex flex-col items-center gap-3.5">
          <TierHeading>{tier.name}</TierHeading>
          <LogoGrid
            sponsors={tier.sponsors}
            size={tier.size}
            label={tier.name}
            // Standard logos go six to a row on the wide page.
            className={tier.size === 'small' ? 'lg:[&>li>*]:w-[calc((100%-80px)/6)]' : undefined}
          />
        </div>
      ))}
    </div>
  );
}

/** "Past partners": their logos with the years they were with us. */
export function PastPartners({ title, sponsors }: { title: string; sponsors: PublicSponsor[] }) {
  const t = useTranslations('partners');
  if (sponsors.length === 0) return null;
  return (
    <div className="flex w-full flex-col items-center gap-3.5 border-t border-line pt-10">
      <TierHeading>{title}</TierHeading>
      <ul
        aria-label={title}
        className="m-0 flex w-full list-none flex-wrap justify-center gap-2.5 p-0 sm:gap-4"
      >
        {sponsors.map((sponsor) => (
          <li
            key={sponsor.id}
            className="flex w-[calc((100%-20px)/3)] flex-col gap-1.5 text-center sm:w-[176px]"
          >
            <PartnerLogo sponsor={sponsor} size="small" className="w-full" />
            {sponsor.years && (
              <span className="text-[13px] text-muted-ink">
                <span className="sr-only">{t('years')} </span>
                {sponsor.years}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
