import { Hourglass } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/primitives/button';

/** "Applications are closed right now" (JoinFormStates › closed): replaces the form. */
export function JoinClosed({
  nextRound,
  meeting,
  instagram,
}: {
  /** "February 2027"; empty: no date is given. */
  nextRound: string;
  /** "Wednesdays at 18:00, room 117, FEEIT": Settings' weekly meeting, or null. */
  meeting: string | null;
  /** Where "Get notified" goes; none: no button. */
  instagram: string | null;
}) {
  const t = useTranslations('join.closed');
  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
  return (
    <div
      role="status"
      className="flex flex-col gap-4.5 rounded-2xl border border-dashed border-line-strong bg-surface p-5 lg:p-9"
    >
      <span
        aria-hidden
        className="flex size-16 items-center justify-center rounded-full border border-line bg-white text-muted-ink"
      >
        <Hourglass className="size-7" />
      </span>
      <div className="flex flex-col gap-2">
        <h3 className="text-[24px] leading-[1.2] font-bold lg:text-[26px]">{t('title')}</h3>
        <p className="text-body leading-[1.6]">
          {nextRound ? t.rich('text', { round: nextRound, strong }) : t('textNoRound')}
        </p>
      </div>
      {meeting && <p className="text-[15px] leading-[1.6] text-muted-ink">{t('meeting', { meeting })}</p>}
      <div className="flex flex-wrap items-center gap-5">
        {instagram && (
          <Button asChild>
            <a href={instagram} target="_blank" rel="noopener noreferrer">
              {t('notify')}
              <span className="sr-only"> {t('newTab')}</span>
            </a>
          </Button>
        )}
        <Link href="/journey" className="font-medium text-brand-dark">
          {t('journey')}
        </Link>
      </div>
    </div>
  );
}
