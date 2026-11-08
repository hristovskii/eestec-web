import { MembersSkeleton } from '@/features/members/public';

// Arriving at /members from another page: the grey band and card skeletons.
export default function MembersLoading() {
  return <MembersSkeleton />;
}
