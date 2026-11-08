import { MemoriesListSkeleton } from '@/features/memories/public';
import { Container } from '@/shared/ui/container';

// Arriving at /memories from another page (MemoriesList): the grey header band and card skeletons.
export default function MemoriesLoading() {
  return (
    <>
      <div aria-hidden className="h-[300px] bg-surface lg:h-[320px]" />
      <Container className="py-8 pb-14 lg:pb-24">
        <MemoriesListSkeleton />
      </Container>
    </>
  );
}
