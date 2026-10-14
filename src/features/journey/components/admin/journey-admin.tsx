'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import type { MediaItem } from '@/features/media';
import { PageEditorFrame, usePageEditor } from '@/shared/admin-ui/page-editor';

import { saveJourney } from '../../actions/admin-journey';
import { JOURNEY_LIMITS } from '../../schemas/journey.schema';
import type { JourneyInput, JourneyRecord } from '../../types';
import { fieldId, type SectionProps } from './form-kit';
import { CtaSection, HeroSection, StepsSection } from './sections';

const SECTION_IDS = ['hero', 'steps', 'cta'] as const;

type JourneyAdminProps = {
  record: JourneyRecord;
  /** The library files the content uses. */
  media: Record<string, MediaItem>;
  canEdit: boolean;
};

/** /admin/pages/journey (spec 07 › Admin-managed data): one form, one "Save changes", sections with a sub-nav. */
export function JourneyAdmin({ record, media: initialMedia, canEdit }: JourneyAdminProps) {
  const t = useTranslations('admin.journey');
  const tMedia = useTranslations('admin.media');
  const [media, setMedia] = React.useState(initialMedia);
  const editor = usePageEditor<JourneyInput>({
    record,
    save: saveJourney,
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

  const message = (key: string): string => {
    const known = ['required', 'tooLong', 'url', 'tooMany', 'tooFew'];
    return t(`errors.${known.includes(key) ? key : 'unexpected'}` as Parameters<typeof t>[0]);
  };
  const error = (path: string) => {
    const key = editor.errorKey(path);
    return key ? message(key) : undefined;
  };

  const labelFor = (path: string): string => {
    const [head = '', a = '', b = '', c = '', d = ''] = path.split('.');
    const row = `${t('sections.steps')} ${Number(a) + 1}`;
    switch (head) {
      case 'hero':
        return t(`hero.${a as 'title'}`);
      case 'cta':
        return a === 'button'
          ? `${t('cta.button')} › ${t(c === 'href' ? 'button.link' : 'button.label')}`
          : t(`cta.${a as 'title'}`);
      case 'steps':
        if (b === 'button')
          return `${row} › ${t(d === 'href' || c === 'href' ? 'button.link' : 'button.label')}`;
        if (b === 'bullets') return `${row} › ${t('steps.bullet', { number: Number(c) + 1 })}`;
        if (b === 'photo') return `${row} › ${tMedia('refField.alt')}`;
        if (b === 'quote') return `${row} › ${t(c === 'author' ? 'steps.quoteAuthor' : 'steps.quoteText')}`;
        if (!b) return t('sections.steps');
        return `${row} › ${t(`steps.${b as 'title'}`)}`;
      default:
        return path;
    }
  };

  // One summary line per field (a localized field reports once, for MK).
  const summary = Object.entries(editor.fieldErrors)
    .filter(([path]) => !path.endsWith('.en'))
    .map(([path, keys]) => ({
      fieldId: path === 'steps' ? 'steps' : fieldId(path),
      label: labelFor(path),
      message: message(keys[0]!),
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
      <p className="text-small text-muted-ink">{t('homeHint', { max: JOURNEY_LIMITS.steps })}</p>
      <HeroSection {...sectionProps} />
      <StepsSection {...sectionProps} />
      <CtaSection {...sectionProps} />
    </PageEditorFrame>
  );
}
