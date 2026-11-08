import { Lock, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';

import type { AlumniCardData, BoardCardData, MemberCardData } from '../types';
import { MemberPhoto } from './member-photo';

type CardProps =
  | {
      variant: 'member';
      member: MemberCardData;
      compact?: boolean;
      hover?: boolean;
      headingLevel?: 'h2' | 'h3';
    }
  | { variant: 'board'; member: BoardCardData; hover?: boolean; headingLevel?: 'h2' | 'h3' }
  | { variant: 'board-row'; member: BoardCardData; headingLevel?: 'h2' | 'h3' }
  | { variant: 'alumni'; member: AlumniCardData; headingLevel?: 'h2' | 'h3' };

const profileHref = (username: string) => `/members/${username}`;

/**
 * One card for every place a person appears (01-MemberCard, 07-MemberCardStates): `member` (grid),
 * `board`, `board-row` (phones) and `alumni`. `compact` is the two-column phone grid. `hover`
 * draws the hover state (the design-system lab).
 */
export function MemberCard(props: CardProps) {
  switch (props.variant) {
    case 'member':
      return <MemberVariant {...props} />;
    case 'board':
      return <BoardVariant {...props} />;
    case 'board-row':
      return <BoardRowVariant {...props} />;
    case 'alumni':
      return <AlumniVariant {...props} />;
  }
}

const ring = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand';

function MemberVariant({
  member,
  compact,
  hover,
  headingLevel: Heading = 'h3',
}: {
  member: MemberCardData;
  compact?: boolean;
  hover?: boolean;
  headingLevel?: 'h2' | 'h3';
}) {
  const t = useTranslations('members.card');
  return (
    <Link
      href={profileHref(member.username)}
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-md bg-white text-ink no-underline shadow-card transition-[box-shadow,transform] duration-150',
        'hover:-translate-y-0.5 hover:shadow-card-hover',
        ring,
        hover && '-translate-y-0.5 shadow-card-hover',
      )}
    >
      <div className="relative aspect-square w-full bg-line">
        <MemberPhoto
          photo={member.photo}
          name={member.name}
          initials={member.initials}
          sizes={compact ? '50vw' : '(min-width: 1024px) 220px, 33vw'}
        />
        {member.membersOnly && (
          <span
            title={t('membersOnlyTitle')}
            className="absolute top-2.5 left-2.5 inline-flex h-[26px] items-center gap-1.5 rounded-full bg-ink px-2.5 text-[12px] font-medium text-white"
          >
            <Lock className="size-[13px]" strokeWidth={2.4} aria-hidden />
            {t('membersOnly')}
          </span>
        )}
      </div>
      <div
        className={cn(
          'flex flex-1 flex-col gap-2',
          compact ? 'px-3 pt-3 pb-3.5' : 'px-3 pt-3 pb-3.5 sm:px-4 sm:pt-3.5 sm:pb-4',
        )}
      >
        <Heading
          className={cn(
            'leading-[1.3] font-bold group-hover:text-brand-dark group-hover:underline',
            hover && 'text-brand-dark underline',
            compact ? 'text-[15px]' : 'text-[15px] sm:text-[17px]',
          )}
        >
          {member.name}
        </Heading>
        {member.teams.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {member.teams.map((team) => (
              <li
                key={team}
                className="inline-flex h-6 items-center rounded-full bg-surface px-[9px] text-[13px] font-medium"
              >
                {team}
              </li>
            ))}
          </ul>
        )}
        <span
          className={cn(
            'mt-auto flex-col text-[13px] whitespace-nowrap text-muted-ink',
            compact ? 'flex' : 'flex sm:hidden',
          )}
        >
          <span>{t(`role.${member.role}`)}</span>
          <span>{t('sinceShort', { year: member.since })}</span>
        </span>
        {!compact && (
          <span className="mt-auto hidden text-[13px] text-muted-ink sm:block">
            {t('roleSince', { role: t(`role.${member.role}`), year: member.since })}
          </span>
        )}
      </div>
    </Link>
  );
}

function BoardVariant({
  member,
  headingLevel: Heading = 'h3',
}: {
  member: BoardCardData;
  hover?: boolean;
  headingLevel?: 'h2' | 'h3';
}) {
  const t = useTranslations('members.card');
  const photo = (
    <div className="relative aspect-square w-full bg-line">
      <MemberPhoto photo={member.photo} name={member.name} initials={member.initials} />
    </div>
  );
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md bg-white shadow-card">
      {member.username ? (
        <Link
          href={profileHref(member.username)}
          aria-label={t('profileOf', { name: member.name })}
          className={ring}
        >
          {photo}
        </Link>
      ) : (
        photo
      )}
      <div className="flex flex-1 flex-col gap-1.5 px-[18px] pt-4 pb-[18px]">
        <span className="text-[13px] font-bold tracking-[0.04em] text-brand-dark uppercase">
          {member.position}
        </span>
        <Heading className="text-[18px] leading-[1.3] font-bold">
          {member.username ? (
            <Link href={profileHref(member.username)} className={cn('text-ink no-underline', ring)}>
              {member.name}
            </Link>
          ) : (
            member.name
          )}
        </Heading>
        {member.email && (
          <a
            href={`mailto:${member.email}`}
            aria-label={t('email', { email: member.email })}
            className={cn(
              'mt-auto inline-flex items-center gap-2 pt-1.5 text-small font-medium text-brand-dark no-underline hover:underline',
              ring,
            )}
          >
            <Mail className="size-4" aria-hidden />
            {member.email}
          </a>
        )}
      </div>
    </div>
  );
}

function BoardRowVariant({
  member,
  headingLevel: Heading = 'h3',
}: {
  member: BoardCardData;
  headingLevel?: 'h2' | 'h3';
}) {
  const t = useTranslations('members.card');
  const photo = (
    <div className="relative size-[84px] shrink-0 overflow-hidden rounded-[10px] bg-line">
      <MemberPhoto
        photo={member.photo}
        name={member.name}
        initials={member.initials}
        initialsClassName="text-2xl"
        sizes="84px"
      />
    </div>
  );
  return (
    <div className="flex w-full items-center gap-3.5 rounded-md bg-white p-3 shadow-card">
      {member.username ? (
        <Link
          href={profileHref(member.username)}
          aria-label={t('profileOf', { name: member.name })}
          className={ring}
        >
          {photo}
        </Link>
      ) : (
        photo
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="text-[12px] font-bold tracking-[0.04em] text-brand-dark uppercase">
          {member.position}
        </span>
        <Heading className="text-[17px] leading-[1.3] font-bold">
          {member.username ? (
            <Link href={profileHref(member.username)} className={cn('text-ink no-underline', ring)}>
              {member.name}
            </Link>
          ) : (
            member.name
          )}
        </Heading>
        {member.email && (
          <a
            href={`mailto:${member.email}`}
            aria-label={t('email', { email: member.email })}
            className={cn(
              'inline-flex min-h-7 items-center gap-1.5 text-small font-medium whitespace-nowrap text-brand-dark no-underline hover:underline',
              ring,
            )}
          >
            <Mail className="size-[15px]" aria-hidden />
            {member.email}
          </a>
        )}
      </div>
    </div>
  );
}

function AlumniVariant({
  member,
  headingLevel: Heading = 'h3',
}: {
  member: AlumniCardData;
  headingLevel?: 'h2' | 'h3';
}) {
  const t = useTranslations('members.card');
  return (
    <Link
      href={profileHref(member.username)}
      className={cn(
        'flex h-full w-full items-center gap-3.5 rounded-md border border-line bg-white px-4 py-3.5 text-ink no-underline hover:border-ink',
        ring,
      )}
    >
      <span
        aria-hidden
        className="flex size-[52px] shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[16px] font-bold text-ink-2"
      >
        {member.initials}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Heading className="text-[16px] font-bold">{member.name}</Heading>
        <span className="text-small text-ink-2">
          {t('active', { years: member.years })}
          {member.highlight && ` · ${member.highlight}`}
        </span>
        {member.now && (
          <span className="truncate text-small text-muted-ink">{t('now', { text: member.now })}</span>
        )}
      </span>
    </Link>
  );
}
