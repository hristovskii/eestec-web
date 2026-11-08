import { Lock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { Link } from '@/shared/i18n/navigation';
import { formatDate } from '@/shared/i18n/format';
import type { Locale } from '@/shared/i18n/routing';
import { cn } from '@/shared/lib/cn';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Chip } from '@/shared/ui/chip';
import { Container } from '@/shared/ui/container';
import { LinkTabs } from '@/shared/ui/link-tabs';
import { Button } from '@/shared/ui/primitives/button';
import { SocialIcon } from '@/shared/ui/social-icon';

import { profileHref, type ProfileParams } from '../schemas/profile-href';
import type { ProfileEventView, ProfilePageView } from '../types';
import { badgeIcons } from './badge-icons';
import { CopyLinkButton } from './copy-link-button';
import { GithubIcon } from './github-icon';
import { MemberPhoto } from './member-photo';
import { socialButtonClasses } from './social-button';

type Full = Extract<ProfilePageView, { kind: 'full' }>;
type Restricted = Extract<ProfilePageView, { kind: 'restricted' }>;

const EVENTS_SHOWN = 5;

/** /members/<username> (07-MemberProfile, -Mobile): hero, About, Events, Memories, Badges. */
export function MemberProfile({
  profile,
  params,
  memories,
}: {
  profile: Full;
  params: ProfileParams;
  /** The "Memories by …" section (M17); null until there is something to show. */
  memories?: React.ReactNode;
}) {
  return (
    <>
      <ProfileHero profile={profile} />
      <Container className="grid gap-10 pt-8 pb-14 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14 lg:pt-14 lg:pb-20">
        <div className="flex min-w-0 flex-col gap-10 lg:gap-14">
          {profile.bio && <About profile={profile} />}
          {profile.badges.length > 0 && (
            <div className="lg:hidden">
              <BadgeList profile={profile} />
            </div>
          )}
          {profile.events.length > 0 && <Events profile={profile} params={params} />}
          {memories}
        </div>
        <aside className="flex flex-col gap-4 max-lg:hidden lg:sticky lg:top-24 lg:self-start">
          {profile.badges.length > 0 && <BadgeList profile={profile} />}
          <WorkWith profile={profile} />
        </aside>
      </Container>
    </>
  );
}

function ProfileHero({ profile }: { profile: Full }) {
  const t = useTranslations('members.profile');
  const tCard = useTranslations('members.card');
  const tNav = useTranslations('nav');
  const tMembers = useTranslations('members');
  const locale = useLocale();
  const since = formatDate(profile.memberSince, locale, 'monthYear');
  const alumnus = profile.status === 'alumni';

  return (
    <div className="bg-surface">
      <Container className="flex flex-col gap-5 pt-5 pb-8 lg:gap-6 lg:pt-8 lg:pb-10">
        <div className="max-lg:hidden">
          <Breadcrumbs
            items={[
              { label: tNav('home'), href: '/' },
              { label: tMembers('title'), href: '/members' },
              { label: profile.name },
            ]}
          />
        </div>
        <Link
          href="/members"
          className="text-small font-medium text-muted-ink no-underline hover:text-brand-dark lg:hidden"
        >
          ← {t('back')}
        </Link>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6 lg:gap-10">
          <div className="relative size-32 shrink-0 overflow-hidden rounded-[16px] bg-line shadow-card lg:size-[220px] lg:rounded-[20px]">
            <MemberPhoto
              photo={profile.photo}
              name={profile.name}
              initials={profile.initials}
              initialsClassName="text-5xl"
              sizes="(min-width: 1024px) 220px, 128px"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3 lg:gap-3.5">
            <div className="flex flex-wrap gap-2">
              {profile.teams.map((team) => (
                <Chip key={team.slug} tone="red">
                  {t('teamChip', { team: team.name })}
                </Chip>
              ))}
              {alumnus ? (
                <Chip tone="outline">{t('alumniChip')}</Chip>
              ) : (
                <Chip tone="outline">{tCard(`role.${profile.role}`)}</Chip>
              )}
            </div>
            <h1 className="type-h1">{profile.name}</h1>
            <p className="text-[17px] text-muted-ink">
              {alumnus && profile.activeYears
                ? t('activeYears', { years: profile.activeYears })
                : t('memberSince', { date: since })}
            </p>
            {alumnus && (profile.alumniHighlight || profile.alumniNow) && (
              <dl className="flex flex-col gap-1 text-[17px]">
                {profile.alumniHighlight && (
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-muted-ink">{t('facts.highlight')}:</dt>
                    <dd className="font-medium">{profile.alumniHighlight}</dd>
                  </div>
                )}
                {profile.alumniNow && (
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-muted-ink">{t('facts.now')}:</dt>
                    <dd className="font-medium">{profile.alumniNow}</dd>
                  </div>
                )}
              </dl>
            )}
            <div className="flex flex-wrap gap-2.5 pt-1">
              {profile.linkedinUrl && (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={socialButtonClasses}
                >
                  <SocialIcon name="linkedin" className="size-[18px]" />
                  {t('linkedin')}
                  <span className="sr-only">{t('newTab')}</span>
                </a>
              )}
              {profile.githubUrl && (
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={socialButtonClasses}
                >
                  <GithubIcon className="size-[18px]" />
                  {t('github')}
                  <span className="sr-only">{t('newTab')}</span>
                </a>
              )}
              <CopyLinkButton />
            </div>
          </div>
          <FactsCard profile={profile} />
        </div>
      </Container>
    </div>
  );
}

function FactsCard({ profile }: { profile: Full }) {
  const t = useTranslations('members.profile.facts');
  const tCard = useTranslations('members.card');
  // Alumni have no facts card: their lines are in the hero, where phones see them too.
  if (profile.status === 'alumni') return null;
  const rows: { label: string; value: string }[] = [];
  if (profile.teams.length > 0)
    rows.push({
      label: t('team', { count: profile.teams.length }),
      value: profile.teams.map((team) => team.name).join(', '),
    });
  rows.push({ label: t('role'), value: tCard(`role.${profile.role}`) });
  rows.push({ label: t('joined'), value: String(profile.since) });
  if (profile.events.length > 0)
    rows.push({
      label: t('events'),
      value: t('eventsValue', {
        attended: profile.counts.attended,
        organized: profile.counts.organized,
      }),
    });
  if (rows.length === 0) return null;
  return (
    <div className="w-[300px] shrink-0 rounded-lg border border-line bg-white p-[22px] max-lg:hidden">
      <dl aria-label={t('label')} className="flex flex-col">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex justify-between gap-3 border-t border-divider py-3 text-[15px] first:border-t-0 first:pt-0 last:pb-0"
          >
            <dt className="text-muted-ink">{row.label}</dt>
            <dd className="text-right font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function About({ profile }: { profile: Full }) {
  const t = useTranslations('members.profile');
  return (
    <section aria-labelledby="h-about" className="flex flex-col gap-3.5">
      <h2 id="h-about" className="type-h3">
        {t('about')}
      </h2>
      <p className="max-w-[720px] text-[17px] leading-[1.7] whitespace-pre-line">{profile.bio}</p>
    </section>
  );
}

function Events({ profile, params }: { profile: Full; params: ProfileParams }) {
  const t = useTranslations('members.profile.events');
  const tScope = useTranslations('events.tabs');
  const locale = useLocale();
  const counts = {
    all: profile.events.length,
    organized: profile.counts.organized,
    attended: profile.counts.attended,
  };
  const tab = params.events;
  const rows = profile.events.filter(
    (event) =>
      tab === 'all' || (tab === 'organized' ? event.role === 'organizer' : event.role === 'participant'),
  );
  const shown = params.show === 'all' ? rows : rows.slice(0, EVENTS_SHOWN);
  const href = (patch: Partial<ProfileParams>) =>
    profileHref(profile.username, { ...params, ...patch }, 'events');

  return (
    <section id="events" aria-labelledby="h-events" className="flex scroll-mt-24 flex-col gap-2">
      <h2 id="h-events" className="type-h3">
        {t('title')}
      </h2>
      <div className="mt-2">
        <LinkTabs
          label={t('tabs')}
          tabs={(['all', 'organized', 'attended'] as const).map((key) => ({
            href: href({ events: key, show: undefined }),
            label: t(key),
            count: counts[key],
            current: tab === key,
          }))}
        />
      </div>
      <ul>
        {shown.map((event, index) => (
          <li key={event.id}>
            <EventRow
              event={event}
              first={index === 0}
              scopeLabel={tScope(`${event.scope}Short`)}
              locale={locale}
            />
          </li>
        ))}
      </ul>
      {rows.length > EVENTS_SHOWN && (
        <Link
          href={href({ show: params.show === 'all' ? undefined : 'all' })}
          scroll={false}
          className="pt-2 text-small font-medium text-brand-dark"
        >
          {params.show === 'all' ? t('showFewer') : t('showAll', { count: rows.length })}
        </Link>
      )}
    </section>
  );
}

function EventRow({
  event,
  first,
  scopeLabel,
  locale,
}: {
  event: ProfileEventView;
  first: boolean;
  scopeLabel: string;
  locale: Locale;
}) {
  const t = useTranslations('members.profile.events');
  return (
    <Link
      href={event.path}
      className={cn(
        'group grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3.5 py-3.5 text-ink no-underline sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:gap-4',
        !first && 'border-t border-divider',
        'focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-brand',
      )}
    >
      <span className="flex h-16 w-[72px] flex-col items-center justify-center rounded-[10px] bg-surface leading-[1.1] whitespace-nowrap">
        <strong className="text-[20px]">{formatDate(event.startsAt, locale, 'dayNumber')}</strong>
        <span className="text-[12px] text-muted-ink">
          {formatDate(event.startsAt, locale, 'monthYearShort')}
        </span>
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <strong
          lang={event.lang === locale ? undefined : event.lang}
          className="text-[17px] group-hover:text-brand-dark group-hover:underline"
        >
          {event.title}
        </strong>
        <span className="text-small text-muted-ink max-sm:hidden">
          {[event.typeName, scopeLabel, event.place].filter(Boolean).join(' · ')}
        </span>
        <span className="text-small text-muted-ink sm:hidden">
          {event.timing === 'upcoming' ? t('upcoming') : scopeLabel}
        </span>
      </span>
      <Chip tone={event.role === 'organizer' ? 'red' : 'outline'}>
        {event.role === 'organizer' ? t('organizer') : t('participant')}
      </Chip>
    </Link>
  );
}

function BadgeList({ profile }: { profile: Full }) {
  const t = useTranslations('members.profile');
  const headingId = React.useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-[20px] leading-[1.3] font-bold">
        {t('badges')}
      </h2>
      <ul className="flex flex-col gap-4">
        {profile.badges.map((badge) => {
          const Icon = badgeIcons[badge.icon];
          return (
            <li
              key={badge.id}
              className="flex items-center gap-3 rounded-md border border-line bg-white px-3.5 py-3"
            >
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand"
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="flex flex-col gap-0.5">
                <strong className="text-[15px]">{badge.name}</strong>
                <span className="text-small text-muted-ink">{badge.text}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function WorkWith({ profile }: { profile: Full }) {
  const t = useTranslations('members.profile.work');
  const team = profile.teams[0];
  if (!team || profile.status === 'alumni') return null;
  const firstName = profile.name.split(' ')[0] ?? profile.name;
  return (
    <div className="mt-3 flex flex-col gap-2.5 rounded-lg bg-surface p-5">
      <strong className="text-[16px]">{t('title', { name: firstName })}</strong>
      <p className="text-small text-muted-ink">{t('text', { team: team.name })}</p>
      <Link href="/contact" className="text-small font-medium text-brand-dark">
        {t('link', { team: team.name })}
      </Link>
    </div>
  );
}

/** A members-only profile seen by a visitor (07-MemberProfile-Restricted): name, team and a log-in card. */
export function RestrictedProfile({ profile }: { profile: Restricted }) {
  const t = useTranslations('members.profile');
  const tNav = useTranslations('nav');
  const tMembers = useTranslations('members');
  const locale = useLocale();
  const since = formatDate(profile.memberSince, locale, 'monthYear');
  const next = `/members/${profile.username}`;
  return (
    <>
      <div className="bg-surface">
        <Container className="flex flex-col gap-5 pt-5 pb-8 lg:gap-6 lg:pt-8 lg:pb-10">
          <div className="max-lg:hidden">
            <Breadcrumbs
              items={[
                { label: tNav('home'), href: '/' },
                { label: tMembers('title'), href: '/members' },
                { label: profile.name },
              ]}
            />
          </div>
          <Link
            href="/members"
            className="text-small font-medium text-muted-ink no-underline hover:text-brand-dark lg:hidden"
          >
            ← {t('back')}
          </Link>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6 lg:gap-10">
            <span
              aria-hidden
              className="flex size-[104px] shrink-0 items-center justify-center rounded-full border border-line bg-white text-[36px] font-bold text-brand-dark lg:size-40 lg:text-[52px]"
            >
              {profile.initials}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:gap-3.5">
              <div className="flex flex-wrap gap-2">
                {profile.teams.map((team) => (
                  <Chip key={team} tone="red">
                    {t('teamChip', { team })}
                  </Chip>
                ))}
                <Chip tone="dark">
                  <Lock className="size-[13px]" strokeWidth={2.4} aria-hidden />
                  {t('restrictedChip')}
                </Chip>
              </div>
              <h1 className="type-h1">{profile.name}</h1>
              <p className="text-[17px] text-muted-ink">{t('memberSince', { date: since })}</p>
            </div>
          </div>
        </Container>
      </div>
      <Container className="pt-10 pb-16 lg:pt-14 lg:pb-24">
        <div className="relative">
          <div aria-hidden className="grid gap-10 opacity-60 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
            <div className="flex flex-col gap-3.5">
              <Skel className="h-[22px] w-[120px]" />
              <Skel className="h-3.5" />
              <Skel className="h-3.5 w-[92%]" />
              <Skel className="h-3.5 w-[70%]" />
              <Skel className="mt-8 h-[22px] w-40" />
              <Skel className="h-16" />
              <Skel className="h-16" />
              <Skel className="h-16" />
            </div>
            <div className="flex flex-col gap-3.5 max-lg:hidden">
              <Skel className="h-[22px] w-[100px]" />
              <Skel className="h-16" />
              <Skel className="h-16" />
            </div>
          </div>
          <div className="absolute inset-0 flex items-start justify-center bg-linear-to-b from-white/50 to-white to-60% pt-4 lg:pt-6">
            <div className="flex w-full max-w-[520px] flex-col items-center gap-4 rounded-lg border border-line bg-white p-6 text-center shadow-menu lg:p-9">
              <span
                aria-hidden
                className="flex size-16 items-center justify-center rounded-full bg-brand-tint text-brand"
              >
                <Lock className="size-7" aria-hidden />
              </span>
              <h2 className="type-h3">
                {t('restricted.title', { name: profile.name.split(' ')[0] ?? profile.name })}
              </h2>
              <p className="text-body text-muted-ink">{t('restricted.text')}</p>
              <div className="flex w-full flex-col gap-3 pt-1.5 sm:w-auto sm:flex-row">
                <Button asChild>
                  <Link href={`/login?next=${next}`}>{t('restricted.login')}</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/register">{t('restricted.create')}</Link>
                </Button>
              </div>
              <p className="pt-1.5 text-small text-muted-ink">
                {t.rich('restricted.notMember', {
                  link: (chunks) => (
                    <Link href="/join" className="font-medium text-brand-dark">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}

function Skel({ className }: { className?: string }) {
  return <span className={cn('block rounded-xs bg-divider', className)} />;
}
