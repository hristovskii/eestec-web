import { resolveLocalized } from '@/shared/i18n/localized';
import type { Locale } from '@/shared/i18n/routing';
import { initials } from '@/shared/lib/initials';

import type {
  ActiveMembers,
  ActiveMembersView,
  AlumniCardData,
  AlumniList,
  AlumniSummary,
  AlumniView,
  BoardCardData,
  BoardPageView,
  BoardView,
  MemberCardData,
  MemberSummary,
} from '../types';
import { yearOf } from './member-role';

// Languages are resolved here, once, so components get plain strings.

export const toMemberCard = (summary: MemberSummary, locale: Locale): MemberCardData => ({
  username: summary.username,
  name: summary.name,
  initials: initials(summary.name),
  photo: summary.photo,
  teams: summary.teams.map((team) => resolveLocalized(team.name, locale)),
  role: summary.role,
  since: yearOf(summary.memberSince),
  membersOnly: summary.membersOnly,
});

/** "2018–2023" (an alumnus without an end date: "2018–"). */
export const activeYears = (memberSince: string, activeTo: string | null) =>
  `${yearOf(memberSince)}–${activeTo ? yearOf(activeTo) : ''}`;

export const toAlumniCard = (summary: AlumniSummary, locale: Locale): AlumniCardData => ({
  username: summary.username,
  name: summary.name,
  initials: initials(summary.name),
  years: activeYears(summary.memberSince, summary.activeTo),
  highlight: summary.highlight ? resolveLocalized(summary.highlight, locale) : '',
  now: summary.now ? resolveLocalized(summary.now, locale) : '',
});

export const toActiveView = (result: ActiveMembers, pageSize: number, locale: Locale): ActiveMembersView => ({
  items: result.items.map((item) => toMemberCard(item, locale)),
  total: result.total,
  page: result.page,
  pageCount: result.pageCount,
  pageSize,
  allCount: result.allCount,
  visibleTotal: result.visibleTotal,
  hiddenCount: result.hiddenCount,
  teams: result.teamCounts.map(({ team, count }) => ({
    slug: team.slug,
    name: resolveLocalized(team.name, locale),
    count,
  })),
});

export const toAlumniView = (result: AlumniList, locale: Locale): AlumniView => ({
  items: result.items.map((item) => toAlumniCard(item, locale)),
  total: result.total,
  matching: result.matching,
});

/** `emailOf`: the position e-mail of a board role (Settings); only the current board shows them. */
export function toBoardView(
  view: BoardView,
  emailOf: (boardRoleId: string) => string | undefined,
): BoardPageView {
  const { selected } = view;
  return {
    mandates: view.mandates.map(({ label, isCurrent }) => ({ label, isCurrent })),
    selected: selected && {
      label: selected.label,
      isCurrent: selected.isCurrent,
      cards: selected.seats.map((seat): BoardCardData => ({
        name: seat.name,
        initials: initials(seat.name),
        username: seat.username,
        position: seat.title,
        email: selected.isCurrent ? (emailOf(seat.boardRoleId) ?? null) : null,
        photo: seat.photo,
      })),
    },
  };
}
