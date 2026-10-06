import { UpcomingListSkeleton } from '@/features/applications';
import { Container } from '@/shared/ui/container';

// Arriving at /upcoming from another page: grey header band and the list skeleton.
export default function UpcomingLoading() {
  return (
    <>
      <div aria-hidden className="h-[228px] bg-surface lg:h-[246px]" />
      <Container className="pt-5 pb-14 lg:pt-8 lg:pb-24">
        <UpcomingListSkeleton />
      </Container>
    </>
  );
}
