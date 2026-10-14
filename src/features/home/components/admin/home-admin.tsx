'use client';

import { Check, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import type { MediaItem } from '@/features/media';
import { AdminPage, AdminPageHeader } from '@/shared/admin-ui/admin-page';
import { UnsavedChangesDialog } from '@/shared/admin-ui/dialogs';
import type { FieldErrors } from '@/shared/forms/action-result';
import { useUnsavedChanges } from '@/shared/forms/use-unsaved-changes';
import { cn } from '@/shared/lib/cn';
import { ErrorSummary } from '@/shared/ui/form/error-summary';
import { Notice } from '@/shared/ui/notice';
import { Button } from '@/shared/ui/primitives/button';

import { saveHome } from '../../actions/admin-home';
import { HOME_LIMITS } from '../../schemas/home.schema';
import type { HomeInput, HomeRecord } from '../../types';
import { fieldId, type SectionProps } from './form-kit';
import {
  AboutSection,
  ActivitiesSection,
  HeroSection,
  LayoutSection,
  StatsSection,
  TimelineSection,
} from './sections';

const SECTIONS = ['hero', 'about', 'activities', 'timeline', 'stats', 'layout'] as const;

type HomeAdminProps = {
  record: HomeRecord;
  /** The library files the content uses. */
  media: Record<string, MediaItem>;
  canEdit: boolean;
};

/** /admin/pages/home (spec 01 › Admin-managed data): one form, one "Save changes", sections with a sub-nav. */
export function HomeAdmin({ record, media: initialMedia, canEdit }: HomeAdminProps) {
  const t = useTranslations('admin.home');
  const [saved, setSaved] = React.useState<HomeInput>(record);
  const [values, setValues] = React.useState(saved);
  const [media, setMedia] = React.useState(initialMedia);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [pending, startTransition] = React.useTransition();
  const summaryRef = React.useRef<HTMLDivElement>(null);

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const guard = useUnsavedChanges(dirty);

  const update = React.useCallback((recipe: (draft: HomeInput) => void) => {
    setValues((current) => {
      const draft = structuredClone(current);
      recipe(draft);
      return draft;
    });
  }, []);
  const addMedia = React.useCallback(
    (item: MediaItem) => setMedia((current) => ({ ...current, [item.id]: item })),
    [],
  );

  const message = (key: string, path: string): string => {
    if (key === 'range') {
      const [min, max] = path.endsWith('.year') ? HOME_LIMITS.year : HOME_LIMITS.value;
      return t('errors.range', { min, max });
    }
    const known = ['required', 'tooLong', 'url', 'number', 'tooMany', 'layout'];
    return t(`errors.${known.includes(key) ? key : 'unexpected'}` as Parameters<typeof t>[0]);
  };
  const error = (path: string) => {
    const key = fieldErrors[path]?.[0];
    return key ? message(key, path) : undefined;
  };

  const labelFor = (path: string): string => {
    const [head = '', a = '', b = '', c = ''] = path.split('.');
    const row = Number(a);
    switch (head) {
      case 'hero':
        if (a === 'primary' || a === 'secondary')
          return `${t(`hero.${a}`)} › ${t(b === 'href' ? 'hero.buttonLink' : 'hero.buttonLabel')}`;
        if (a === 'image') return `${t('hero.image')} › ${t('image.alt')}`;
        return t(`hero.${a as 'headline'}`);
      case 'about':
        return t('about.body');
      case 'activities':
        return `${t('sections.activities')} ${row + 1} › ${t(`activities.${(b || 'title') as 'title'}`)}`;
      case 'milestones':
        return `${t('sections.timeline')} ${row + 1} › ${b === 'photo' && c === 'alt' ? t('image.alt') : t(`timeline.${(b || 'title') as 'title'}`)}`;
      case 'stats':
        return `${t('sections.stats')} ${row + 1} › ${t(`stats.${(b || 'label') as 'label'}`)}`;
      case 'layout':
        return t('sections.layout');
      default:
        return path;
    }
  };

  // One summary line per field (a localized field reports once, for MK).
  const summary = Object.entries(fieldErrors)
    .filter(([path]) => !path.endsWith('.en'))
    .map(([path, keys]) => ({
      fieldId: head(path) === 'layout' ? 'layout' : fieldId(path),
      label: labelFor(path),
      message: message(keys[0]!, path),
    }))
    .filter((item, index, all) => all.findIndex((other) => other.fieldId === item.fieldId) === index);

  const save = () =>
    new Promise<boolean>((resolve) =>
      startTransition(async () => {
        const result = await saveHome(values);
        if (result.ok) {
          setSaved(result.data);
          setValues(result.data);
          setFieldErrors({});
          toast.success(t('savedToast'));
          resolve(true);
        } else if (result.error === 'validation') {
          setFieldErrors(result.fieldErrors);
          requestAnimationFrame(() => summaryRef.current?.focus());
          resolve(false);
        } else {
          toast.error(t(result.error === 'forbidden' ? 'errors.forbidden' : 'errors.unexpected'));
          resolve(false);
        }
      }),
    );

  const sectionProps: SectionProps = { values, update, error, media, addMedia };

  return (
    <AdminPage className="xl:max-w-[1240px]">
      <div className="z-10 -mx-4 bg-surface px-4 pt-1 pb-3 md:-mx-6 md:px-6 lg:sticky lg:top-15 xl:-mx-8 xl:px-8">
        <AdminPageHeader
          title={t('title')}
          description={t('description')}
          actions={
            <span className="flex items-center gap-3">
              <span role="status" className="flex items-center gap-1.5 text-[13px] text-muted-ink">
                {pending ? (
                  <>
                    <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
                    {t('saving')}
                  </>
                ) : dirty ? (
                  <>
                    <span aria-hidden className="size-2 rounded-full bg-brand" />
                    <span className="font-medium text-ink">{t('unsaved')}</span>
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" aria-hidden />
                    {t('saved')}
                  </>
                )}
              </span>
              <Button
                size="sm"
                onClick={() => void save()}
                disabled={!canEdit || !dirty || pending}
                aria-busy={pending || undefined}
              >
                {t('save')}
              </Button>
            </span>
          }
        />
      </div>

      {!canEdit && <Notice tone="info">{t('readOnly')}</Notice>}

      {summary.length > 0 && (
        <ErrorSummary
          ref={summaryRef}
          title={t('errorSummary', { count: summary.length })}
          errors={summary}
        />
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-6">
        <SectionNav />
        <fieldset disabled={!canEdit} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
          <p className="text-small text-muted-ink">
            {t.rich('mapHint', {
              link: (chunks) => (
                <Link href="/admin/pages/map" className="font-medium text-brand-dark">
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <HeroSection {...sectionProps} />
          <AboutSection {...sectionProps} />
          <ActivitiesSection {...sectionProps} />
          <TimelineSection {...sectionProps} />
          <StatsSection {...sectionProps} />
          <LayoutSection {...sectionProps} />
        </fieldset>
      </div>

      <UnsavedChangesDialog
        open={guard.open}
        itemTitle={t('title')}
        onStay={guard.stay}
        onDiscard={() => {
          setValues(saved);
          guard.leave();
        }}
        onSaveAndLeave={async () => {
          if (await save()) guard.leave();
          else guard.stay();
        }}
      />
    </AdminPage>
  );
}

const head = (path: string) => path.split('.')[0];

/** Sticky sub-nav (desktop) / scrolling chips (mobile); the section in view is marked. */
function SectionNav() {
  const t = useTranslations('admin.home');
  const [active, setActive] = React.useState<string>(SECTIONS[0]);

  // The section being read: the last one whose top has passed under the sticky header.
  React.useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let current: string = SECTIONS[0];
        for (const section of SECTIONS) {
          const top = document.getElementById(section)?.getBoundingClientRect().top ?? Infinity;
          if (top <= 200) current = section;
        }
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        setActive(atBottom ? SECTIONS.at(-1)! : current);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <nav
      aria-label={t('sectionsNav')}
      className="-mx-4 overflow-x-auto px-4 lg:sticky lg:top-40 lg:mx-0 lg:overflow-visible lg:px-0"
    >
      <ul className="flex gap-1 lg:flex-col lg:gap-0.5">
        {SECTIONS.map((section) => (
          <li key={section}>
            <a
              href={`#${section}`}
              aria-current={active === section ? 'true' : undefined}
              onClick={() => setActive(section)}
              className={cn(
                'flex h-9 items-center rounded-sm px-3 text-small whitespace-nowrap no-underline',
                'focus-visible:outline-2 focus-visible:outline-brand',
                active === section
                  ? 'bg-white font-bold text-ink shadow-[0_0_0_1px_var(--color-line)]'
                  : 'text-ink-2 hover:bg-divider',
              )}
            >
              {t(`sections.${section}`)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
