import { LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Container } from '@/shared/ui/container';
import { Skeleton } from '@/shared/ui/primitives/skeleton';

/** First load of /members: the grey band and card skeletons. */
export function MembersSkeleton() {
  const t = useTranslations('members');
  return (
    <>
      <div aria-hidden className="h-[260px] bg-surface lg:h-[300px]" />
      <Container className="flex flex-col gap-5 py-10 lg:py-16">
        <p role="status" aria-live="polite" className="flex items-center gap-2.5 text-small text-muted-ink">
          <LoaderCircle className="size-4.5 animate-spin text-brand motion-reduce:animate-none" aria-hidden />
          {t('loading')}
        </p>
        <div aria-busy="true" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, index) => (
            <Skeleton
              key={index}
              className={index >= 4 ? 'h-[250px] rounded-md max-sm:hidden' : 'h-[250px] rounded-md'}
            />
          ))}
        </div>
      </Container>
    </>
  );
}
