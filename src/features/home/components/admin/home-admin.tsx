'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import type { MediaItem } from '@/features/media';
import { PageEditorFrame, usePageEditor } from '@/shared/admin-ui/page-editor';

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

const SECTION_IDS = ['hero', 'about', 'activities', 'timeline', 'stats', 'layout'] as const;

type HomeAdminProps = {
  record: HomeRecord;
  /** The library files the content uses. */
  media: Record<string, MediaItem>;
  canEdit: boolean;
};

/** /admin/pages/home (spec 01 › Admin-managed data): one form, one "Save changes", sections with a sub-nav. */
export function HomeAdmin({ record, media: initialMedia, canEdit }: HomeAdminProps) {
  const t = useTranslations('admin.home');
  const tMedia = useTranslations('admin.media');
  const [media, setMedia] = React.useState(initialMedia);
  const editor = usePageEditor<HomeInput>({
    record,
    save: saveHome,
    messages: {
      saved: t('savedToast'),
      forbidden: t('errors.forbidden'),
      unexpected: t('errors.unexpected'),
    },
  });
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
    const key = editor.errorKey(path);
    return key ? message(key, path) : undefined;
  };

  const labelFor = (path: string): string => {
    const [head = '', a = '', b = '', c = ''] = path.split('.');
    const row = Number(a);
    switch (head) {
      case 'hero':
        if (a === 'primary' || a === 'secondary')
          return `${t(`hero.${a}`)} › ${t(b === 'href' ? 'hero.buttonLink' : 'hero.buttonLabel')}`;
        if (a === 'image') return `${t('hero.image')} › ${tMedia('refField.alt')}`;
        return t(`hero.${a as 'headline'}`);
      case 'about':
        return t('about.body');
      case 'activities':
        return `${t('sections.activities')} ${row + 1} › ${t(`activities.${(b || 'title') as 'title'}`)}`;
      case 'milestones':
        return `${t('sections.timeline')} ${row + 1} › ${b === 'photo' && c === 'alt' ? tMedia('refField.alt') : t(`timeline.${(b || 'title') as 'title'}`)}`;
      case 'stats':
        return `${t('sections.stats')} ${row + 1} › ${t(`stats.${(b || 'label') as 'label'}`)}`;
      case 'layout':
        return t('sections.layout');
      default:
        return path;
    }
  };

  // One summary line per field (a localized field reports once, for MK).
  const summary = Object.entries(editor.fieldErrors)
    .filter(([path]) => !path.endsWith('.en'))
    .map(([path, keys]) => ({
      fieldId: path.startsWith('layout') ? 'layout' : fieldId(path),
      label: labelFor(path),
      message: message(keys[0]!, path),
    }))
    .filter((item, index, all) => all.findIndex((other) => other.fieldId === item.fieldId) === index);

  const sectionProps: SectionProps = { values: editor.values, update: editor.update, error, media, addMedia };

  return (
    <PageEditorFrame
      editor={editor}
      title={t('title')}
      description={t('description')}
      canEdit={canEdit}
      readOnlyNote={t('readOnly')}
      sections={SECTION_IDS.map((id) => ({ id, label: t(`sections.${id}`) }))}
      sectionsNavLabel={t('sectionsNav')}
      errors={summary}
      errorSummaryTitle={t('errorSummary', { count: summary.length })}
    >
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
    </PageEditorFrame>
  );
}
