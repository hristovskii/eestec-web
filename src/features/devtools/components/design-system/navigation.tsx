import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { FilterChip, RemovableTag } from '@/shared/ui/chip';
import { EmptyState } from '@/shared/ui/empty-state';
import { LinkTabs } from '@/shared/ui/link-tabs';
import { Pagination } from '@/shared/ui/pagination';
import { Button } from '@/shared/ui/primitives/button';

import { DsLabel, DsSection } from './ds-section';

const TYPES = [
  'All types',
  'Workshop',
  'Exchange',
  'Motivational Weekend',
  'Training / Soft Skills',
  'Competition',
  'Conference / Statutory',
  'Social',
  'Other',
];

export function NavigationSection() {
  return (
    <DsSection
      id="navigation"
      title="Lists: navigation"
      intro="Same markup on every list page. Tabs, chips, tags and page numbers are plain links: filters and page live in the URL and work without JavaScript."
      frames="03-EventsList, 03-EventsList-Empty"
    >
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Events' }]} />
      <LinkTabs
        label="Event category"
        tabs={[
          { href: '/design-system?tab=local', label: 'Local Events', count: 96, current: true },
          {
            href: '/design-system?tab=international',
            label: 'International Events',
            count: 52,
            current: false,
          },
        ]}
      />
      <div className="flex flex-col gap-3">
        <DsLabel>Filter chips</DsLabel>
        <div className="flex flex-wrap gap-2.5">
          {TYPES.map((type, index) => (
            <FilterChip key={type} href={`/design-system?type=${index}`} pressed={index === 0}>
              {type}
            </FilterChip>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <DsLabel>Active filters</DsLabel>
        <div className="flex flex-wrap gap-2">
          <RemovableTag removeHref="/design-system">“hackathon”</RemovableTag>
          <RemovableTag removeHref="/design-system">Competition</RemovableTag>
          <RemovableTag removeHref="/design-system">2012</RemovableTag>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <DsLabel>Page numbers</DsLabel>
        <Pagination page={1} pageCount={8} hrefForPage={(page) => `/design-system?page=${page}#navigation`} />
      </div>
      <div className="flex flex-col gap-3">
        <DsLabel>No results</DsLabel>
        <EmptyState
          title="No events match your search"
          tags={
            <>
              <RemovableTag removeHref="/design-system">“hackathon”</RemovableTag>
              <RemovableTag removeHref="/design-system">Competition</RemovableTag>
            </>
          }
          actions={
            <>
              <Button variant="primary">Clear all filters</Button>
              <Button variant="secondary">Search International Events</Button>
            </>
          }
        >
          We couldn&apos;t find a local Competition event called “hackathon” in 2012. Try another year or
          type, or clear the filters.
        </EmptyState>
      </div>
    </DsSection>
  );
}
