import { Lock, UserX } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/shared/i18n/navigation';
import { pageRange } from '@/shared/lib/pagination';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Chip, FilterChip, RemovableTag } from '@/shared/ui/chip';
import { Container } from '@/shared/ui/container';
import { EmptyState } from '@/shared/ui/empty-state';
import { Pagination } from '@/shared/ui/pagination';
import { Button } from '@/shared/ui/primitives/button';
import { SectionTitle, TitleBar } from '@/shared/ui/section-title';

import {
  hasMemberFilters,
  joinedOptions as joinedChoices,
  membersHref,
  type MembersParams,
} from '../schemas/members-href';
import type { ActiveMembersView, AlumniView, BoardPageView } from '../types';
import { AlumniSearch, BoardSelect, MembersFilters } from './members-filters';
import { MemberCard } from './member-card';

/** The signed-in member looking at the page (null: a visitor). */
export type MembersViewer = {
  firstName: string;
  initials: string;
  /** null: no profile of their own yet (e.g. a board account). */
  visibility: 'public' | 'members_only' | null;
};

export type MembersPageProps = {
  params: MembersParams;
  viewer: MembersViewer | null;
  board: BoardPageView;
  active: ActiveMembersView;
  alumni: AlumniView;
  /** Used for the "Joined" select and the year tag. */
  currentYear: number;
  /** Name of the chosen team, for its tag. */
  teamName: string | undefined;
};

const strong = (chunks: React.ReactNode) => <strong className="text-ink">{chunks}</strong>;

/** /members (07-MembersPage, -Member, -Empty, -Mobile…): hero, board, active members, alumni. */
export function MembersPage(props: MembersPageProps) {
  const { viewer, board, active, alumni } = props;
  return (
    <>
      <MembersHero viewer={viewer} board={board} active={active} alumni={alumni} />
      <BoardSection params={props.params} board={board} />
      <ActiveSection {...props} />
      <AlumniSection params={props.params} alumni={alumni} />
      {!viewer && <JoinBand />}
    </>
  );
}

function MembersHero({
  viewer,
  board,
  active,
  alumni,
}: Pick<MembersPageProps, 'viewer' | 'board' | 'active' | 'alumni'>) {
  const t = useTranslations('members');
  const tNav = useTranslations('nav');
  return (
    <div className="bg-surface">
      <Container className="flex flex-col gap-5 pt-6 pb-7 lg:gap-7 lg:pt-10 lg:pb-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="flex flex-col gap-3 lg:gap-3.5">
            <Breadcrumbs items={[{ label: tNav('home'), href: '/' }, { label: t('title') }]} />
            <h1 className="type-h1">{t('title')}</h1>
            <TitleBar />
            <p className="mt-1 max-w-[640px] text-[17px] leading-[1.6] text-muted-ink lg:text-[18px]">
              <span className="lg:hidden">{t('leadShort')}</span>
              <span className="max-lg:hidden">{t('lead')}</span>
            </p>
          </div>
          {viewer ? <MemberCardBox viewer={viewer} /> : <VisitorCardBox />}
        </div>
        <nav aria-label={t('jump.label')}>
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {board.selected && (
              <li className="shrink-0">
                <JumpLink href="#board">
                  <span className="max-sm:hidden">{t('jump.board', { label: board.selected.label })}</span>
                  <span className="sm:hidden">{t('jump.boardShort')}</span>
                </JumpLink>
              </li>
            )}
            <li className="shrink-0">
              <JumpLink href="#active">
                <span className="max-sm:hidden">{t('jump.active')}</span>
                <span className="sm:hidden">{t('jump.activeShort')}</span>
                <Chip size="sm" className="h-[22px] bg-surface px-2">
                  {active.visibleTotal}
                </Chip>
              </JumpLink>
            </li>
            <li className="shrink-0">
              <JumpLink href="#alumni">
                {t('jump.alumni')}
                <Chip size="sm" className="h-[22px] bg-surface px-2">
                  {alumni.total}
                </Chip>
              </JumpLink>
            </li>
          </ul>
        </nav>
      </Container>
    </div>
  );
}

function JumpLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-small font-medium whitespace-nowrap text-ink no-underline hover:border-brand hover:text-brand-dark focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {children}
    </a>
  );
}

function VisitorCardBox() {
  const t = useTranslations('members.hero');
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-white p-4 lg:w-[360px] lg:shrink-0 lg:gap-3 lg:px-[22px] lg:py-5">
      <strong className="text-[15px] lg:text-[16px]">{t('visitorTitle')}</strong>
      <p className="text-small text-muted-ink">
        <span className="lg:hidden">{t('visitorTextShort')}</span>
        <span className="max-lg:hidden">{t('visitorText')}</span>
      </p>
      <div className="flex gap-2.5">
        <Button asChild size="sm" className="max-lg:w-full">
          <Link href="/login?next=/members">{t('login')}</Link>
        </Button>
        <Button asChild size="sm" variant="quiet" className="max-lg:hidden">
          <Link href="/register">{t('create')}</Link>
        </Button>
      </div>
    </div>
  );
}

function MemberCardBox({ viewer }: { viewer: MembersViewer }) {
  const t = useTranslations('members.hero');
  return (
    <div className="flex items-center gap-3.5 rounded-lg border border-line bg-white p-4 lg:w-[360px] lg:shrink-0 lg:px-[22px] lg:py-5">
      <span
        aria-hidden
        className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-brand-tint text-[17px] font-bold text-brand-dark"
      >
        {viewer.initials}
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <strong className="text-[16px]">{t('hi', { name: viewer.firstName })}</strong>
        {viewer.visibility && (
          <span className="text-small text-muted-ink">
            {viewer.visibility === 'public' ? t('visiblePublic') : t('visibleMembers')}
          </span>
        )}
        <Link href="/profile" className="mt-1 text-small font-medium text-brand-dark">
          {t('editProfile')}
        </Link>
      </span>
    </div>
  );
}

function BoardSection({ params, board }: { params: MembersParams; board: BoardPageView }) {
  const t = useTranslations('members.board');
  const { selected } = board;
  if (!selected) return null;
  return (
    <section id="board" aria-labelledby="h-board" className="scroll-mt-20 py-10 lg:py-16 lg:pb-[72px]">
      <Container className="flex flex-col gap-5 lg:gap-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <SectionTitle
            id="h-board"
            title={t('title', { label: selected.label })}
            intro={selected.isCurrent ? t('introCurrent') : t('introPast')}
          />
          {board.mandates.length > 1 && (
            <BoardSelect params={params} mandates={board.mandates} selected={selected.label} />
          )}
        </div>
        <ul className="hidden grid-cols-3 gap-6 sm:grid lg:grid-cols-5">
          {selected.cards.map((card) => (
            <li key={`${card.position}-${card.name}`} className="min-w-0">
              <MemberCard variant="board" member={card} />
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-3 sm:hidden">
          {selected.cards.map((card) => (
            <li key={`${card.position}-${card.name}`}>
              <MemberCard variant="board-row" member={card} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function ActiveSection({ params, viewer, active, currentYear, teamName }: MembersPageProps) {
  const t = useTranslations('members');
  const years = joinedChoices(currentYear);
  const filtered = hasMemberFilters(params);
  const { from, to } = pageRange(active.page, active.pageSize, active.total);
  const hrefTo = (patch: Parameters<typeof membersHref>[1]) => membersHref(params, patch, 'active');
  const yearTag = params.year
    ? (years.find((option) => option.value === params.year) ?? {
        earlier: false,
        year: Number(params.year.slice(0, 4)),
      })
    : undefined;

  return (
    <section
      id="active"
      aria-labelledby="h-active"
      className="scroll-mt-20 border-t border-divider py-10 lg:py-16 lg:pb-20"
    >
      <Container className="flex flex-col gap-5 lg:gap-7">
        <SectionTitle id="h-active" title={t('active.title')} />
        <div className="flex flex-col gap-4">
          <MembersFilters params={params} joinedOptions={years} />
          <div
            role="group"
            aria-label={t('active.teams')}
            className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
          >
            <FilterChip href={hrefTo({ team: null })} pressed={!params.team} count={active.allCount}>
              {t('active.allTeams')}
            </FilterChip>
            {active.teams.map((team) => (
              <FilterChip
                key={team.slug}
                href={hrefTo({ team: team.slug })}
                pressed={params.team === team.slug}
                count={team.count}
              >
                {team.name}
              </FilterChip>
            ))}
          </div>
        </div>

        {active.total > 0 ? (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p role="status" className="text-small text-muted-ink">
                {t.rich('active.showing', { from, to, total: active.total, strong })}
              </p>
              {viewer ? (
                <p className="flex items-center gap-2 text-small text-ink-2">
                  <Chip tone="dark" size="sm" className="h-6">
                    {t('active.membersOnlyPill')}
                  </Chip>
                  {t('active.membersOnlyNote')}
                </p>
              ) : (
                active.hiddenCount > 0 && (
                  <p className="flex items-center gap-2 text-small text-ink-2">
                    <Lock className="size-4 shrink-0" aria-hidden />
                    <span>
                      {t('active.hiddenVisitor', { count: active.hiddenCount })}{' '}
                      <Link href="/login?next=/members" className="font-medium text-brand-dark">
                        {t('active.hiddenLogin')}
                      </Link>
                    </span>
                  </p>
                )
              )}
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5">
              {active.items.map((member) => (
                <li key={member.username} className="min-w-0">
                  <MemberCard variant="member" member={member} />
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-4 lg:mt-6">
              <Pagination
                page={active.page}
                pageCount={active.pageCount}
                hrefForPage={(page) => hrefTo({ page })}
                backToTop={false}
              />
              {active.pageCount > 1 && (
                <a href="#active" className="text-small font-medium text-brand-dark max-sm:hidden">
                  {t('active.back')}
                </a>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p role="status" className="text-small text-muted-ink">
                {t.rich('active.found', { count: 0, strong })}
              </p>
              {filtered && (
                <div className="flex max-w-full items-center gap-2 overflow-x-auto max-sm:-mx-4 max-sm:px-4 sm:flex-wrap">
                  {params.q && (
                    <RemovableTag removeHref={hrefTo({ q: null })}>
                      {t('empty.searchTag', { query: params.q })}
                    </RemovableTag>
                  )}
                  {params.team && (
                    <RemovableTag removeHref={hrefTo({ team: null })}>
                      {t('empty.teamTag', { team: teamName ?? params.team })}
                    </RemovableTag>
                  )}
                  {yearTag && params.year && (
                    <RemovableTag removeHref={hrefTo({ year: null })}>
                      {yearTag.earlier
                        ? t('active.earlier', { year: yearTag.year })
                        : t('empty.yearTag', { year: yearTag.year })}
                    </RemovableTag>
                  )}
                  <Link
                    href={hrefTo({ q: null, team: null, year: null })}
                    scroll={false}
                    className="shrink-0 px-1.5 text-small font-medium text-brand-dark"
                  >
                    {t('empty.clearAll')}
                  </Link>
                </div>
              )}
            </div>
            <EmptyState
              variant="list"
              icon={<UserX aria-hidden />}
              title={filtered ? t('empty.title') : t('empty.title')}
              actions={
                filtered && (
                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center">
                    <Button asChild block className="sm:w-auto">
                      <Link href={hrefTo({ q: null, team: null, year: null })} scroll={false}>
                        {t('empty.clear')}
                      </Link>
                    </Button>
                    {params.q && (
                      <Button asChild variant="secondary" block className="sm:w-auto">
                        <Link href={membersHref(params, { aq: params.q, alumni: 'all' }, 'alumni')}>
                          {t('empty.alumni', { query: params.q })}
                        </Link>
                      </Button>
                    )}
                  </div>
                )
              }
            >
              {filtered ? t('empty.text', { query: params.q ?? 'none' }) : t('empty.textNoFilters')}
            </EmptyState>
          </>
        )}
      </Container>
    </section>
  );
}

function AlumniSection({ params, alumni }: { params: MembersParams; alumni: AlumniView }) {
  const t = useTranslations('members.alumni');
  const searching = Boolean(params.aq);
  const hasMore = alumni.matching > alumni.items.length;
  return (
    <section
      id="alumni"
      aria-labelledby="h-alumni"
      className="scroll-mt-20 bg-surface py-10 lg:py-16 lg:pb-20"
    >
      <Container className="flex flex-col gap-5 lg:gap-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <SectionTitle
            id="h-alumni"
            title={t('title')}
            intro={alumni.total > 0 ? t('intro', { count: alumni.total }) : undefined}
          />
          {alumni.total > 0 && (
            <div className="max-sm:hidden">
              <AlumniSearch params={params} />
            </div>
          )}
        </div>
        {alumni.items.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {alumni.items.map((member, index) => (
              <li
                key={member.username}
                className={index >= 4 && !params.alumni ? 'min-w-0 max-sm:hidden' : 'min-w-0'}
              >
                <MemberCard variant="alumni" member={member} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            variant="list"
            title={searching ? t('empty', { query: params.aq ?? '' }) : t('none')}
            actions={
              searching && (
                <Button asChild variant="secondary">
                  <Link href={membersHref(params, { aq: null }, 'alumni')} scroll={false}>
                    {t('clear')}
                  </Link>
                </Button>
              )
            }
          />
        )}
        {hasMore && (
          <div className="flex justify-center">
            <Button asChild variant="secondary" className="max-sm:w-full">
              <Link href={membersHref(params, { alumni: 'all' }, 'alumni')} scroll={false}>
                {t('showAll', { count: alumni.matching })}
              </Link>
            </Button>
          </div>
        )}
        {params.alumni === 'all' && alumni.matching > 9 && (
          <div className="flex justify-center">
            <Button asChild variant="quiet" className="max-sm:w-full">
              <Link href={membersHref(params, { alumni: null }, 'alumni')} scroll={false}>
                {t('showLess')}
              </Link>
            </Button>
          </div>
        )}
      </Container>
    </section>
  );
}

function JoinBand() {
  const t = useTranslations('members.cta');
  return (
    <section className="bg-brand text-white">
      <Container className="flex flex-col gap-5 py-10 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:py-12">
        <div className="flex flex-col gap-2">
          <h2 className="text-[24px] font-bold lg:text-[28px]">{t('title')}</h2>
          <p className="text-[17px] font-medium">{t('text')}</p>
        </div>
        <Button asChild variant="inverse" className="max-lg:w-full">
          <Link href="/join">{t('button')}</Link>
        </Button>
      </Container>
    </section>
  );
}
