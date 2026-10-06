import { EventsArchiveSkeleton } from '@/features/events';
import { Container } from '@/shared/ui/container';

// Arriving at /events from another page (EventsList-Loading): grey header band and card skeletons.
export default function EventsLoading() {
  return (
    <>
      <div aria-hidden className="h-[228px] bg-surface lg:h-[246px]" />
      <Container className="pb-14 lg:pb-24">
        <EventsArchiveSkeleton />
      </Container>
    </>
  );
}
