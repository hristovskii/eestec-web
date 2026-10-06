'use client';

import { Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

/**
 * A YouTube / Vimeo video that loads only when played (EventDetail › Aftermovie): no third-party
 * request, cookie or script until the visitor asks for it.
 */
export function VideoPlayer({ embedUrl, title }: { embedUrl: string; title: string }) {
  const t = useTranslations('events.detail');
  const [playing, setPlaying] = React.useState(false);
  const box = 'relative aspect-video w-full overflow-hidden rounded-md bg-ink sm:rounded-lg';
  if (playing)
    return (
      <div className={box}>
        <iframe
          src={embedUrl}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      </div>
    );
  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={t('playVideo', { title })}
      className={`${box} group flex cursor-pointer items-center justify-center focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand`}
    >
      <span className="absolute bottom-2.5 left-3.5 max-w-[80%] truncate text-small font-medium text-white sm:bottom-4 sm:left-5 sm:text-[15px]">
        {title}
      </span>
      <span className="flex size-15 items-center justify-center rounded-full bg-brand text-white shadow-[0_8px_24px_rgb(0_0_0/0.35)] transition-transform group-hover:scale-105 motion-reduce:transition-none sm:size-20">
        <Play className="size-6 fill-current sm:size-8" aria-hidden />
      </span>
    </button>
  );
}
