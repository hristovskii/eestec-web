import { Calendar, Clock, Eye, MapPin, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type * as React from 'react';

import { EventCard } from '@/features/events';
import { formatDate } from '@/shared/i18n/format';
import { Link } from '@/shared/i18n/navigation';
import type { Locale } from '@/shared/i18n/routing';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { InitialsAvatar } from '@/shared/ui/cards';
import { Chip } from '@/shared/ui/chip';
import { Container } from '@/shared/ui/container';
import { GalleryGrid } from '@/shared/ui/gallery';
import { MediaImage } from '@/shared/ui/media-image';
import { Notice } from '@/shared/ui/notice';
import { Button } from '@/shared/ui/primitives/button';
import { RichText } from '@/shared/ui/rich-text';
import { ShareButtons } from '@/shared/ui/share-buttons';

import type { MemoryAuthor, MemoryCardModel, MemoryPostModel } from '../../types';
import { MemoryCard } from './memory-card';
import { ShareMemoryButton } from './share-memory-button';

/**
 * What only the author sees on top of their own post:
 * - preview: a draft, a waiting Memory or one that was not approved (MemoryPost-Preview);
 * - changes: a published Memory with changes waiting or not approved (MemoryPost-ChangesWaiting).
 */
export type MemoryPostNotice =
  | {
      kind: 'preview';
      status: 'draft' | 'pending' | 'rejected' | 'published';
      editHref: string | null;
      submit?: React.ReactNode;
    }
  | { kind: 'changes'; state: 'pending'; since: string; editHref: string }
  | { kind: 'changes'; state: 'rejected'; reason: string; editHref: string };

type MemoryPostProps = {
  post: MemoryPostModel;
  author: MemoryAuthor | undefined;
  /** Published Memories of this author (the "N Memories" link). */
  authorMemories: number;
  related: { items: MemoryCardModel[]; total: number };
  authors: Record<string, MemoryAuthor>;
  locale: Locale;
  /** Absolute address, for the share links. */
  url: string;
  /** A signed-in member (the "Were you there too?" card goes to the editor). */
  member: boolean;
  notice?: MemoryPostNotice | undefined;
};

/** /memories/<slug> (MemoryPost, -Mobile, -Former, -Preview, -ChangesWaiting). */
export function MemoryPost({
  post,
  author,
  authorMemories,
  related,
  authors,
  locale,
  url,
  member,
  notice,
}: MemoryPostProps) {
  const t = useTranslations('memories');
  const tNav = useTranslations('nav');
  const former = post.authorDeleted;
  const name = former ? t('post.formerMember') : (author?.name ?? t('card.unknownAuthor'));
  const eventSlug = post.event.slug;

  return (
    <article>
      {notice && <PostNotice notice={notice} locale={locale} />}

      <Container className="flex flex-col gap-5 pt-6 pb-6 lg:pt-8">
        <Breadcrumbs
          items={[
            { label: tNav('home'), href: '/' },
            { label: t('title'), href: '/memories' },
            { label: post.title.length > 48 ? `${post.title.slice(0, 48)}…` : post.title },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          {post.event.href ? (
            <Link href={post.event.href} className="no-underline">
              <Chip tone="red" className="hover:underline" lang={post.event.titleLang ?? undefined}>
                {post.event.title}
              </Chip>
            </Link>
          ) : (
            post.event.title && <Chip tone="red">{post.event.title}</Chip>
          )}
          {post.event.typeName && <Chip>{post.event.typeName}</Chip>}
        </div>
        <h1 className="max-w-[900px] type-h1">{post.title}</h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex items-center gap-3">
            <AuthorAvatar author={author} former={former} size={44} />
            <div className="flex flex-col leading-tight">
              {author?.username && !former ? (
                <Link
                  href={`/members/${author.username}`}
                  className="text-[16px] font-bold text-ink no-underline hover:text-brand-dark hover:underline"
                >
                  {name}
                </Link>
              ) : (
                <span className="text-[16px] font-bold text-ink">{name}</span>
              )}
              <span className="text-small text-muted-ink">
                {former ? t('post.formerSub') : (author?.teams[0] ?? '')}
              </span>
            </div>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-small text-muted-ink">
            <li className="flex items-center gap-1.5">
              <Calendar className="size-4 text-brand" aria-hidden />
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale, 'date')}</time>
            </li>
            {post.happenedOn && (
              <li>{t('post.happened', { date: formatDate(post.happenedOn, locale, 'date') })}</li>
            )}
            {post.place && (
              <li className="flex items-center gap-1.5">
                <MapPin className="size-4 text-brand" aria-hidden />
                {post.place}
              </li>
            )}
            <li className="flex items-center gap-1.5">
              <Clock className="size-4 text-brand" aria-hidden />
              {t('post.readTime', { minutes: post.readMinutes })}
            </li>
          </ul>
        </div>
      </Container>

      {post.cover && (
        <Container>
          <figure className="flex flex-col gap-2">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-divider lg:aspect-[21/9]">
              <MediaImage media={post.cover} preset="cover" priority />
            </div>
            {'credit' in post.cover && post.cover.credit && (
              <figcaption className="text-small text-muted-ink">
                {t('post.photoCredit', { credit: post.cover.credit })}
              </figcaption>
            )}
          </figure>
        </Container>
      )}

      <Container className="grid gap-10 py-8 lg:grid-cols-[minmax(0,740px)_340px] lg:justify-between lg:gap-12 lg:py-12">
        <div className="flex min-w-0 flex-col gap-10">
          <RichText html={post.body} />

          {post.photos.length > 0 && (
            <section aria-labelledby="mem-photos" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="mem-photos" className="text-[22px] font-bold">
                  {t('post.photos')}
                </h2>
                <span className="text-small text-muted-ink">
                  {t('post.photosCount', { count: post.photos.length })}
                </span>
              </div>
              <GalleryGrid photos={post.photos} title={post.title} />
            </section>
          )}

          <section aria-labelledby="mem-share" className="flex flex-col gap-3 border-t border-line pt-6">
            <h2 id="mem-share" className="text-[16px] font-bold">
              {t('post.share')}
            </h2>
            <ShareButtons url={url} title={post.title} />
          </section>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          {post.eventCard && (
            <section aria-labelledby="mem-event" className="flex flex-col gap-3">
              <h2 id="mem-event" className="text-[16px] font-bold">
                {t('post.about')}
              </h2>
              <EventCard
                event={post.eventCard}
                locale={locale}
                href={post.event.href ?? undefined}
                headingLevel="h3"
              />
            </section>
          )}
          <section
            aria-labelledby="mem-author"
            className="flex flex-col gap-3 rounded-md border border-line bg-white p-5"
          >
            <h2 id="mem-author" className="text-[16px] font-bold">
              {t('post.writtenBy')}
            </h2>
            <div className="flex items-center gap-3">
              <AuthorAvatar author={author} former={former} size={48} />
              <div className="flex min-w-0 flex-col leading-tight">
                <strong className="text-[16px]">{name}</strong>
                <span className="text-small text-muted-ink">
                  {former
                    ? t('post.formerCard')
                    : author
                      ? [author.teams[0], t('post.since', { year: author.since })].filter(Boolean).join(' · ')
                      : ''}
                </span>
              </div>
            </div>
            {former ? (
              <p className="text-small text-muted-ink">{t('post.formerText')}</p>
            ) : (
              <>
                {author?.bio && <p className="line-clamp-4 text-small text-ink-2">{author.bio}</p>}
                {author?.username && (
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-small font-medium">
                    <Link href={`/members/${author.username}`} className="text-brand-dark">
                      {t('post.viewProfile')}
                    </Link>
                    {authorMemories > 1 && (
                      <Link href={`/memories?author=${author.username}`} className="text-brand-dark">
                        {t('post.authorMemories', { count: authorMemories })}
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </aside>
      </Container>

      {eventSlug && (
        <div className="bg-surface">
          <Container className="flex flex-col gap-6 py-10 lg:py-14">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-[26px] leading-[1.25] font-bold">{t('related.title')}</h2>
              {related.total > 0 && (
                <Link
                  href={`/memories?event=${eventSlug}`}
                  className="text-small font-medium text-brand-dark"
                >
                  {t('related.all', { count: related.total + 1, event: post.event.title })}
                </Link>
              )}
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {related.items.slice(0, 2).map((memory) => (
                <li key={memory.id}>
                  <MemoryCard
                    memory={memory}
                    author={memory.authorId ? authors[memory.authorId] : undefined}
                    locale={locale}
                  />
                </li>
              ))}
              <li>
                <div className="flex h-full min-h-[240px] flex-col items-start justify-center gap-3 rounded-md border border-dashed border-line-strong bg-white p-6">
                  <h3 className="text-[20px] leading-[1.3] font-bold">
                    {t('related.askTitle', { event: post.event.title })}
                  </h3>
                  <p className="text-small text-muted-ink">{t('related.askText')}</p>
                  <ShareMemoryButton
                    member={member}
                    href={`/memories/new?event=${eventSlug}`}
                    variant="secondary"
                  />
                </div>
              </li>
            </ul>
          </Container>
        </div>
      )}
    </article>
  );
}

function AuthorAvatar({
  author,
  former,
  size,
}: {
  author: MemoryAuthor | undefined;
  former: boolean;
  size: number;
}) {
  if (!former && author?.photo?.src) {
    // A member's own photo (a plain img: the address is a stored file, like the profile page).
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={author.photo.src}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <InitialsAvatar
      initials={former ? '?' : (author?.initials ?? '?')}
      size={size}
      tone={former ? 'grey' : 'dark'}
    />
  );
}

function PostNotice({ notice, locale }: { notice: MemoryPostNotice; locale: Locale }) {
  const t = useTranslations('memories.notice');
  if (notice.kind === 'preview') {
    const waiting = notice.status === 'pending';
    const published = notice.status === 'published';
    return (
      <Container className="pt-4">
        <Notice
          tone="dark"
          role="status"
          icon={<Eye className="size-[22px]" />}
          title={waiting ? t('waitingTitle') : t('previewTitle')}
          actions={
            <>
              {notice.editHref && (
                <Button asChild variant="inverse" size="sm">
                  <Link href={notice.editHref}>{t('backToEditing')}</Link>
                </Button>
              )}
              {notice.submit}
            </>
          }
        >
          {waiting ? t('waitingText') : published ? t('liveText') : t('previewText')}
        </Notice>
      </Container>
    );
  }
  return (
    <Container className="pt-4">
      {notice.state === 'pending' ? (
        <Notice
          role="status"
          icon={<Pencil className="size-[22px]" />}
          title={t('changesTitle')}
          actions={
            <>
              <Link
                href={`${notice.editHref}?view=changes` as never}
                className="text-small font-medium text-brand-dark underline underline-offset-2"
              >
                {t('seeChanges')}
              </Link>
              <Link
                href={notice.editHref}
                className="text-small font-medium text-brand-dark underline underline-offset-2"
              >
                {t('edit')}
              </Link>
            </>
          }
        >
          {t('changesText', { date: formatDate(notice.since, locale, 'dayMonth') })}
        </Notice>
      ) : (
        <Notice
          tone="urgent"
          role="status"
          title={t('changesRejectedTitle')}
          actions={
            <Link
              href={notice.editHref}
              className="text-small font-medium text-brand-dark underline underline-offset-2"
            >
              {t('edit')}
            </Link>
          }
        >
          {t('changesRejectedText', { reason: notice.reason })}
        </Notice>
      )}
    </Container>
  );
}
