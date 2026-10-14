import type * as React from 'react';

import { ActionLink } from '@/shared/ui/action-link';
import { Button } from '@/shared/ui/primitives/button';
import { Container } from '@/shared/ui/container';
import { MediaImage } from '@/shared/ui/media-image';

import type { PublicHome } from '../types';

/**
 * The red first screen (Home-Desktop › Welcome): line above, headline, subtitle, two buttons, and
 * on the right the next event (a slot: the page passes it when there is an upcoming event). With a
 * photo from Admin › Pages › Home it sits under a red cover, so the white text stays readable.
 */
export function HomeHero({ hero, children }: { hero: PublicHome['hero']; children?: React.ReactNode }) {
  return (
    <section aria-label={hero.headline} className="relative isolate overflow-hidden bg-brand text-white">
      {hero.image ? (
        <>
          <MediaImage media={hero.image} preset="full" priority />
          <div aria-hidden className="absolute inset-0 bg-brand/85" />
        </>
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.16)_1.5px,transparent_1.6px)] bg-size-[22px_22px]"
        />
      )}
      <Container
        className={
          children
            ? 'relative grid gap-8 py-10 pb-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-14 lg:py-22 lg:pb-26'
            : 'relative py-10 pb-12 lg:py-22 lg:pb-26'
        }
      >
        <div className="flex flex-col items-start gap-5 lg:gap-6">
          {hero.eyebrow && (
            <span className="inline-flex min-h-[30px] items-center rounded-full border border-white/70 px-3 text-small font-medium lg:min-h-8">
              {hero.eyebrow}
            </span>
          )}
          <h1 className="max-w-160 text-[34px] leading-[1.15] font-bold tracking-[-0.01em] lg:text-[56px]">
            {hero.headline}
          </h1>
          <p className="max-w-140 text-[18px] leading-[1.5] font-medium lg:text-[20px]">{hero.subtitle}</p>
          <div className="flex w-full flex-col gap-3 pt-1 sm:w-auto sm:flex-row sm:gap-4 lg:pt-2">
            <Button asChild variant="inverse">
              <ActionLink href={hero.primary.href}>{hero.primary.label}</ActionLink>
            </Button>
            <Button asChild variant="outlineWhite">
              <ActionLink href={hero.secondary.href}>{hero.secondary.label}</ActionLink>
            </Button>
          </div>
        </div>
        {children}
      </Container>
    </section>
  );
}
