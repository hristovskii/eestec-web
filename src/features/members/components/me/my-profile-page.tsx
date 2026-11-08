import { Clock, Globe, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/shared/i18n/navigation';
import { Chip } from '@/shared/ui/chip';
import { Container } from '@/shared/ui/container';
import { Notice } from '@/shared/ui/notice';
import { Button } from '@/shared/ui/primitives/button';
import { Skeleton } from '@/shared/ui/primitives/skeleton';
import { TitleBar } from '@/shared/ui/section-title';

import type { MyProfileView } from '../../types';
import { BoardFacts } from './board-facts';
import { MeCard } from './me-card';
import { MyProfileNav, type MyProfileNavItem } from './my-profile-nav';
import { ProfileForm } from './profile-form';
import { VisibilityCard } from './visibility-card';

/**
 * /profile (07-MyProfile, -Mobile, MyProfileStates): header, the section menu and the cards. The
 * layout of the phone is the same page in one column (the drawn phone frame is a reduced mock; the
 * phone still has every section, because e-mail, password and deleting live here too).
 */
export function MyProfilePage({ view, faculties }: { view: MyProfileView; faculties: string[] }) {
  const t = useTranslations('members.me');
  const items: MyProfileNavItem[] = [
    { id: 'profile', label: t('nav.profile') },
    { id: 'visibility', label: t('nav.visibility') },
  ];
  const chip = view.pending ? 'pending' : view.visibility === 'public' ? 'public' : 'members';
  const ChipIcon = chip === 'public' ? Globe : Lock;

  return (
    <div className="bg-surface">
      <Container className="flex flex-col gap-5 pt-8 pb-6 md:flex-row md:items-end md:justify-between md:pt-10 md:pb-8">
        <div className="flex flex-col gap-3">
          <h1 className="type-h1">{t('title')}</h1>
          <TitleBar />
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-muted-ink">
            <span>
              {t.rich('loggedInAs', {
                email: view.email,
                strong: (chunks) => <strong className="font-bold break-all text-ink">{chunks}</strong>,
              })}
            </span>
            <span aria-hidden>·</span>
            <Chip tone="dark" size="sm" data-testid="visibility-chip">
              <ChipIcon className="size-3" aria-hidden />
              {t(`chip.${chip}`)}
            </Chip>
          </p>
        </div>
        {!view.pending && (
          <div className="flex gap-2.5">
            <Button asChild variant="quiet" size="sm">
              <Link href={`/members/${view.username}`}>{t('viewPublic')}</Link>
            </Button>
          </div>
        )}
      </Container>

      {view.pending && (
        <Container className="pb-6">
          <Notice
            tone="dark"
            role="status"
            icon={<Clock className="size-[22px]" />}
            title={t('pending.title')}
            actions={
              <Link
                href="/contact"
                className="text-small font-medium text-white underline underline-offset-2"
              >
                {t('pending.questions')}
              </Link>
            }
          >
            {t('pending.text')}
          </Notice>
        </Container>
      )}

      <Container className="grid gap-5 pb-24 lg:grid-cols-[232px_minmax(0,1fr)] lg:items-start lg:gap-10">
        <MyProfileNav items={items} />
        <div className="flex min-w-0 flex-col gap-6">
          <MeCard id="profile" title={t('profile.title')} help={t('profile.help')} bodyClassName="p-0">
            <ProfileForm
              initial={view.values}
              faculties={faculties}
              photo={view.photo}
              initials={view.initials}
              board={<BoardFacts board={view.board} />}
            />
          </MeCard>
          <MeCard id="visibility" title={t('visibility.title')} help={t('visibility.help')}>
            <VisibilityCard value={view.visibility} username={view.username} pending={view.pending} />
          </MeCard>
        </div>
      </Container>
    </div>
  );
}

/** First load of /profile. */
export function MyProfileSkeleton() {
  return (
    <div className="bg-surface" aria-busy="true">
      <Container className="flex flex-col gap-3 pt-10 pb-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-6 w-96 max-w-full" />
      </Container>
      <Container className="grid gap-6 pb-24 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-10">
        <Skeleton className="hidden h-[280px] rounded-md lg:block" />
        <div className="flex flex-col gap-6">
          <Skeleton className="h-[720px] rounded-lg" />
          <Skeleton className="h-[220px] rounded-lg" />
        </div>
      </Container>
    </div>
  );
}
