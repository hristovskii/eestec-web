import * as React from 'react';

import { Breadcrumbs, type Crumb } from '@/shared/ui/breadcrumbs';
import { Container } from '@/shared/ui/container';
import { TitleBar } from '@/shared/ui/section-title';

type PageHeaderProps = {
  title: React.ReactNode;
  breadcrumbs?: Crumb[];
  lead?: React.ReactNode;
  /** Right-aligned actions on desktop (e.g. "Upcoming Events" on /events). */
  actions?: React.ReactNode;
  /** Language of the title / lead when it falls back to Macedonian on an English page. */
  lang?: string;
};

/** Grey band at the top of list and content pages (EventsList): breadcrumbs, H1 + red bar, lead, actions. */
export function PageHeader({ title, breadcrumbs, lead, actions, lang }: PageHeaderProps) {
  return (
    <div className="bg-surface">
      <Container className="flex flex-col gap-5 py-8 lg:py-10">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3" lang={lang}>
            <h1 className="type-h1">{title}</h1>
            <TitleBar />
            {lead && <p className="mt-2 max-w-[680px] text-[17px] leading-[1.6] text-ink-2">{lead}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
        </div>
      </Container>
    </div>
  );
}
