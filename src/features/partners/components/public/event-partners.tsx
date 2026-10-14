import { cn } from '@/shared/lib/cn';

import type { PublicSponsor } from '../../types';
import { PartnerLogo } from './partner-logo';

/**
 * "Event partners" on the event page (EventDetail): a small panel of logos, two to a row beside
 * the details on desktop, three to a row on phones. Nothing is shown without partners.
 */
export function EventPartners({
  title,
  sponsors,
  className,
}: {
  title: string;
  sponsors: PublicSponsor[];
  className?: string;
}) {
  if (sponsors.length === 0) return null;
  return (
    <section
      aria-labelledby="event-partners-title"
      className={cn(
        'flex flex-col gap-3 lg:gap-3.5 lg:rounded-2xl lg:border lg:border-line lg:p-6',
        className,
      )}
    >
      <h2 id="event-partners-title" className="text-[16px] font-bold">
        {title}
      </h2>
      <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 lg:grid-cols-2 lg:gap-2.5">
        {sponsors.map((sponsor) => (
          <li key={sponsor.id} className="min-w-0">
            <PartnerLogo sponsor={sponsor} size="small" compact />
          </li>
        ))}
      </ul>
    </section>
  );
}
