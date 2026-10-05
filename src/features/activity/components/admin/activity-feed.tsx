import { useFormatter, useTranslations } from 'next-intl';

import { InitialsAvatar } from '@/shared/ui/cards';

import type { ActivityEntry } from '../../types';

/** One sentence per entry: "Ana Trajkovska published Workshop: AI at the Edge". */
export function ActivitySentence({ entry }: { entry: ActivityEntry }) {
  const t = useTranslations('admin.activity');
  return (
    <span>
      {entry.actor && <strong className="font-medium">{entry.actor.name} </strong>}
      {t(`actions.${entry.action}`, { target: entry.target })}
    </span>
  );
}

/** Recent activity (AdminDashboard): avatar, sentence, relative time. */
export function ActivityFeed({ entries, now }: { entries: ActivityEntry[]; now: string }) {
  const format = useFormatter();
  const current = new Date(now);
  return (
    <ul className="flex flex-col gap-4 px-5 py-4">
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <InitialsAvatar
            initials={entry.actor?.initials ?? 'SY'}
            size={32}
            tone={entry.actor ? 'dark' : 'grey'}
          />
          <span className="flex flex-col text-[15px]">
            <ActivitySentence entry={entry} />
            <span className="text-[13px] text-muted-ink">
              {format.relativeTime(new Date(entry.at), current)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
