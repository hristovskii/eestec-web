'use client';

import { Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

import { needsCarousel } from '../../domain/tiers';
import type { PublicTier } from '../../types';
import { PartnerLogo } from './partner-logo';
import { LogoGrid, TierHeading } from './partner-tiers';

const WIDE = '(min-width: 640px)';

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
/** Desktop until the browser says otherwise: the server renders the static grid. */
const useWide = () =>
  React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => true,
  );

/** One tier on Home: a plain row, or a slowly scrolling one when it does not fit (PartnersStates). */
function HomeTier({ tier }: { tier: PublicTier }) {
  const t = useTranslations('partners.marquee');
  const wide = useWide();
  const [paused, setPaused] = React.useState(false);
  const carousel = needsCarousel(tier.sponsors.length, wide ? 'desktop' : 'mobile');

  return (
    <div className="flex w-full flex-col items-center gap-3.5">
      <div className="flex w-full items-center justify-center gap-2.5">
        <TierHeading>{tier.name}</TierHeading>
        {carousel && (
          <button
            type="button"
            aria-label={paused ? t('play') : t('pause')}
            onClick={() => setPaused((current) => !current)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-line-strong bg-white p-0 text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:hidden"
          >
            {paused ? (
              <Play className="size-3" fill="currentColor" aria-hidden />
            ) : (
              <Pause className="size-3" fill="currentColor" aria-hidden />
            )}
          </button>
        )}
      </div>
      {carousel ? (
        <div
          role="group"
          aria-label={tier.name}
          className="group/row w-full overflow-hidden mask-[linear-gradient(90deg,transparent_0,#000_6%,#000_94%,transparent_100%)] motion-reduce:overflow-x-auto"
        >
          <ul
            className={cn(
              'm-0 flex w-max list-none gap-2.5 p-0 py-1 sm:gap-4',
              'animate-partner-marquee group-focus-within/row:[animation-play-state:paused] group-hover/row:[animation-play-state:paused] motion-reduce:animate-none',
              paused && '[animation-play-state:paused]',
            )}
          >
            {[false, true].flatMap((duplicate) =>
              tier.sponsors.map((sponsor) => (
                <li
                  key={`${sponsor.id}-${duplicate}`}
                  aria-hidden={duplicate || undefined}
                  className="shrink-0"
                >
                  <PartnerLogo
                    sponsor={sponsor}
                    size="small"
                    duplicate={duplicate}
                    className="w-[132px] sm:w-[176px]"
                  />
                </li>
              )),
            )}
          </ul>
        </div>
      ) : (
        <LogoGrid sponsors={tier.sponsors} size={tier.size} label={tier.name} />
      )}
    </div>
  );
}

/** The tiers of the Home partner strip. */
export function HomePartnerTiers({ tiers }: { tiers: PublicTier[] }) {
  return (
    <div className="flex w-full flex-col gap-7 lg:gap-9">
      {tiers.map((tier) => (
        <HomeTier key={tier.id} tier={tier} />
      ))}
    </div>
  );
}
