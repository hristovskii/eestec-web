import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { Suspense } from 'react';

import { getSession } from '@/features/auth/server';
import { MemoryPost, type MemoryPostNotice } from '@/features/memories/public';
import {
  countMemoryRead,
  getMemoriesOfAuthor,
  getMemoriesOfEvent,
  getMemoryPost,
  getMemorySlugs,
  getMyMemoryPost,
} from '@/features/memories/server';
import { getAudience, getAuthorCards } from '@/features/members/server';
import { socialMetadata } from '@/features/settings/server';
import { SITE_URL } from '@/shared/config/site';
import { currentLocale } from '@/shared/i18n/current-locale';
import type { Locale } from '@/shared/i18n/routing';
import { localizedPath } from '@/shared/seo/alternates';

// Published Memories get their page shell at build time; everyone else renders on the first visit.
// At least one param is required under Cache Components, hence the placeholder (it 404s).
export async function generateStaticParams() {
  const slugs = await getMemorySlugs();
  return slugs.length > 0 ? slugs.map((slug) => ({ slug })) : [{ slug: '__none__' }];
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/memories/[slug]'>): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, currentLocale()]);
  const post = await getMemoryPost(slug, locale);
  // A Memory that is not published (a draft, one waiting for the board) is never listed.
  if (!post) return { robots: { index: false, follow: false } };
  return {
    title: post.title,
    ...(await socialMetadata(`/memories/${slug}`, locale, {})),
  };
}

async function Post({
  params,
  locale,
}: {
  params: PageProps<'/[locale]/memories/[slug]'>['params'];
  locale: Locale;
}) {
  const { slug } = await params;
  const session = await getSession();
  const [published, mine] = await Promise.all([
    getMemoryPost(slug, locale),
    session ? getMyMemoryPost(session.userId, slug, locale) : Promise.resolve(null),
  ]);
  // The author sees their own draft, waiting or not approved Memory here (as a preview); a published
  // one shows what readers see, with a note when changes are waiting.
  const post = published ?? mine?.post ?? null;
  if (!post) notFound();
  const isAuthor = Boolean(mine);
  if (published && !isAuthor) after(() => countMemoryRead(slug));

  const editHref = mine?.own.record.slug
    ? `/memories/${mine.own.record.slug}/edit`
    : `/memories/new?draft=${mine?.own.record.id ?? ''}`;
  let notice: MemoryPostNotice | undefined;
  if (mine && !published)
    notice = {
      kind: 'preview',
      status: mine.own.record.status,
      editHref: mine.own.record.status === 'pending' ? null : editHref,
    };
  else if (mine?.own.record.revision?.status === 'pending')
    notice = {
      kind: 'changes',
      state: 'pending',
      since: mine.own.record.revision.submittedAt,
      editHref,
    };
  else if (mine?.own.record.revision?.status === 'rejected')
    notice = { kind: 'changes', state: 'rejected', reason: mine.own.record.revision.reason, editHref };

  const audience = await getAudience();
  const [related, authorOwn] = await Promise.all([
    post.eventId
      ? getMemoriesOfEvent(post.eventId, locale, { limit: 3, excludeId: post.id })
      : Promise.resolve({ items: [], total: 0 }),
    post.authorId ? getMemoriesOfAuthor(post.authorId, locale, 1) : Promise.resolve({ items: [], total: 0 }),
  ]);
  const authors = await getAuthorCards(audience, locale, [
    ...(post.authorId ? [post.authorId] : []),
    ...related.items.flatMap((memory) => (memory.authorId ? [memory.authorId] : [])),
  ]);
  const member = session?.memberStatus === 'active' || session?.memberStatus === 'alumni';
  return (
    <MemoryPost
      post={post}
      author={post.authorId ? authors[post.authorId] : undefined}
      authorMemories={authorOwn.total}
      related={related}
      authors={authors}
      locale={locale}
      url={`${SITE_URL.origin}${localizedPath(`/memories/${slug}`, locale)}`}
      member={member}
      notice={notice}
    />
  );
}

// /memories/[slug] (MemoryPost): the post is cached; who is looking (the author's notes, the
// related cards' authors) is not, so the page streams behind a skeleton.
export default async function MemoryRoute({ params }: PageProps<'/[locale]/memories/[slug]'>) {
  const locale = await currentLocale();
  return (
    <Suspense fallback={<div aria-hidden className="min-h-[60vh]" />}>
      <Post params={params} locale={locale} />
    </Suspense>
  );
}
