import { useLocale, useTranslations } from 'next-intl';

import { formatDate } from '@/shared/i18n/format';

import type { MyProfileView } from '../../types';

/** "Set by the board" (MyProfile): team, role, member since and badges. Read-only; wrong? write to the board. */
export function BoardFacts({ board }: { board: MyProfileView['board'] }) {
  const t = useTranslations('members.me.board');
  const role = useTranslations('members.card.role');
  const locale = useLocale();
  const facts: [string, string][] = [
    [t('team', { count: Math.max(board.teams.length, 1) }), board.teams.join(', ') || t('noTeam')],
    [t('role'), role(board.role)],
    [t('since'), formatDate(board.since, locale, 'monthYearShort')],
    [t('badges'), String(board.badges)],
  ];
  return (
    <div className="flex flex-col gap-2.5">
      <span className="flex items-center gap-2 text-small font-medium">
        <LockIcon />
        {t('title')}
      </span>
      <dl className="m-0 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5 rounded-sm bg-surface px-3.5 py-3">
            <dt className="text-[13px] text-muted-ink">{label}</dt>
            <dd className="m-0 text-[15px] font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {board.email && (
        <p className="text-small text-muted-ink">
          {t.rich('write', {
            email: board.email,
            link: (chunks) => (
              <a href={`mailto:${board.email}`} className="font-medium text-brand-dark hover:underline">
                {chunks}
              </a>
            ),
          })}
        </p>
      )}
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
