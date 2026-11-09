import { Download } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { accessTo, type Actor } from '@/features/auth';
import { AdminPage, AdminPageHeader, AdminTabs, TablePanel } from '@/shared/admin-ui/admin-page';
import { AdminPageCrumb } from '@/shared/layout/admin/admin-shell';
import { hrefWithParams } from '@/shared/lib/search-params';
import { Notice } from '@/shared/ui/notice';
import { Button } from '@/shared/ui/primitives/button';

import { getIdeasTabCounts } from '../../admin-queries';
import { getIdeaFormSettings } from '../../queries';
import { IDEAS_TABS, type AdminIdeasParams, type IdeasTab } from '../../schemas/admin-ideas-params.schema';
import { FormSettings } from './form-settings';
import { FeedbackList, IdeasList } from './ideas-lists';
import { RatingsView } from './ratings-view';

/** The red "5 new" next to a tab: what still needs a look (red counts that need action are allowed). */
function NewPill({ count, label }: { count: number; label: string }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex h-5 items-center rounded-full bg-brand px-2 text-[12px] font-bold text-white">
      {label}
    </span>
  );
}

/**
 * /admin/ideas: Ideas, Event feedback and Ratings per event. Super admins and editors read and
 * handle everything; an event manager reads the feedback and ratings of their own events (D18).
 * `notifyEnabled`: Settings › E-mail notifications › Ideas & feedback, shown in Form settings.
 */
export async function IdeasAdmin({
  params,
  actor,
  notifyEnabled,
}: {
  params: AdminIdeasParams;
  actor: Actor;
  notifyEnabled: boolean;
}) {
  const access = accessTo(actor, 'ideas');
  const own = access === 'ownRead';
  const canEdit = access === 'full';
  const tabs: IdeasTab[] = own ? ['feedback', 'ratings'] : [...IDEAS_TABS];
  // An event manager has no Ideas tab: that address shows their feedback instead.
  const tab: IdeasTab = own && params.tab === 'ideas' ? 'feedback' : params.tab;
  const [t, counts, form] = await Promise.all([
    getTranslations('admin.ideas'),
    getIdeasTabCounts(actor),
    canEdit ? getIdeaFormSettings() : Promise.resolve(null),
  ]);
  const newCounts = { ideas: counts.ideas, feedback: counts.feedback, ratings: 0 };
  const tabHref = (value: IdeasTab) =>
    hrefWithParams('/admin/ideas', '', { tab: value === 'ideas' ? null : value });
  const scope = { ...params, tab };

  return (
    <AdminPage>
      <AdminPageCrumb label={t(`tabs.${tab}`)} />
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            {tab !== 'ratings' && (
              <Button asChild variant="quiet">
                <a href={`/api/export/ideas-${tab}`} download>
                  <Download aria-hidden />
                  {t('exportCsv')}
                </a>
              </Button>
            )}
            {form && (
              <FormSettings
                settings={form}
                notify={{ enabled: notifyEnabled, canChange: actorCanSettings(actor) }}
              />
            )}
          </>
        }
      />
      {own && <Notice className="mb-4">{t('readOnly')}</Notice>}
      <TablePanel>
        <AdminTabs
          label={t('tabsLabel')}
          tabs={tabs.map((value) => ({
            href: tabHref(value),
            current: tab === value,
            label: (
              <>
                {t(`tabs.${value}`)}
                <NewPill count={newCounts[value]} label={t('newCount', { count: newCounts[value] })} />
              </>
            ),
          }))}
        />
        {tab === 'ideas' && <IdeasList params={scope} canEdit={canEdit} />}
        {tab === 'feedback' && <FeedbackList params={scope} actor={actor} canEdit={canEdit} />}
        {tab === 'ratings' && <RatingsView params={scope} actor={actor} />}
      </TablePanel>
    </AdminPage>
  );
}

/** Settings are for super admins (D18): the notification switch is theirs. */
const actorCanSettings = (actor: Actor) => accessTo(actor, 'settings') === 'full';
