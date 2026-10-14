'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import type { MediaItem } from '@/features/media';
import { PageEditorFrame, usePageEditor } from '@/shared/admin-ui/page-editor';

import { saveJoin } from '../../actions/admin-join';
import type { JoinInput, JoinRecord } from '../../types';
import { fieldId, type SectionProps } from './form-kit';
import {
  ApplySection,
  BenefitsSection,
  DocumentsSection,
  FaqSection,
  GlanceSection,
  HowSection,
  PageSection,
  RulesSection,
  WhoSection,
} from './sections';

const SECTION_IDS = [
  'page',
  'glance',
  'why',
  'who',
  'how',
  'rules',
  'conduct',
  'documents',
  'faq',
  'apply',
] as const;

type JoinAdminProps = {
  record: JoinRecord;
  /** The library files the content uses. */
  media: Record<string, MediaItem>;
  canEdit: boolean;
};

/** /admin/pages/join (spec 08 › Admin-managed data): one form, one "Save changes", sections with a sub-nav. */
export function JoinAdmin({ record, media: initialMedia, canEdit }: JoinAdminProps) {
  const t = useTranslations('admin.join');
  const [media, setMedia] = React.useState(initialMedia);
  const editor = usePageEditor<JoinInput>({
    record,
    save: saveJoin,
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
    const known = ['required', 'tooLong', 'tooMany', 'tooFew'];
    return t(`errors.${known.includes(key) ? key : 'unexpected'}` as Parameters<typeof t>[0]);
  };
  const error = (path: string) => {
    const key = editor.errorKey(path);
    return key ? message(key) : undefined;
  };

  // "faq.2.question.mk" → "FAQ 3 › Question": the section, the row number and the field.
  const labelFor = (path: string): string => {
    const parts = path.split('.');
    const [head = '', a = '', b = '', c = ''] = parts;
    const row = (section: string) => `${section} ${Number(a) + 1}`;
    switch (head) {
      case 'hero':
        return t(`page.${a as 'title'}`);
      case 'headings':
        return t('page.headingOf', { section: t(`nav.${a as 'why'}`) });
      case 'glance':
        return `${row(t('sections.glance'))} › ${t(`glance.${(b || 'label') as 'label'}`)}`;
      case 'benefits':
        return `${row(t('sections.why'))} › ${t(`cards.${(b || 'title') as 'title'}`)}`;
      case 'eligibility':
        return a === 'items'
          ? `${t('sections.who')} › ${t('who.item', { number: Number(b) + 1 })}`
          : t(`who.${a as 'noteTitle'}`);
      case 'steps':
        return `${row(t('sections.how'))} › ${t(`how.${(b || 'title') as 'text'}`, { number: Number(a) + 1 })}`;
      case 'fee':
        return t(`how.fee${a[0]!.toUpperCase()}${a.slice(1)}` as 'how.feeAmount');
      case 'rules':
        if (a === 'conduct')
          return `${t('conduct.title')} ${Number(b) + 1} › ${t(`cards.${(c || 'title') as 'title'}`)}`;
        if (a === 'intro') return t('rules.intro');
        if (a === 'international')
          return `${t('rules.international')} › ${t(`rules.${b as 'before'}`)} ${Number(c) + 1}`;
        return `${t(`rules.${a as 'rights'}`)} ${Number(b) + 1}`;
      case 'documents':
        return `${row(t('sections.documents'))} › ${t(b === 'mediaId' ? 'documents.file' : 'documents.title')}`;
      case 'faq':
        return `${row(t('sections.faq'))} › ${t(`faq.${(b || 'question') as 'question'}`)}`;
      case 'apply':
        if (a === 'faculties' || a === 'interests' || a === 'heardFrom')
          return `${t(`apply.lists.${a}`)}${b ? ` ${Number(b) + 1}` : ''}`;
        return t(`apply.${a as 'intro'}`);
      default:
        return path;
    }
  };

  // The field a summary line links to: a list-level error goes to the section.
  const target = (path: string) => {
    const parts = path.split('.');
    const isListLevel =
      (['benefits', 'steps', 'glance', 'documents', 'faq'].includes(parts[0]!) && parts.length === 1) ||
      (parts[0] === 'rules' &&
        (parts.length === 2 || (parts[1] === 'international' && parts.length === 3))) ||
      (parts[0] === 'eligibility' && parts.length === 2 && parts[1] === 'items') ||
      (parts[0] === 'apply' && parts.length === 2 && parts[1] !== 'open');
    if (!isListLevel) return fieldId(path);
    if (parts[0] === 'benefits') return 'why';
    if (parts[0] === 'rules') return parts[1] === 'conduct' ? 'conduct' : 'rules';
    if (parts[0] === 'eligibility') return 'who';
    if (parts[0] === 'steps') return 'how';
    return parts[0] === 'apply' ? 'apply' : parts[0]!;
  };

  // One summary line per field (a localized field reports once, for MK).
  const summary = Object.entries(editor.fieldErrors)
    .filter(([path]) => !path.endsWith('.en'))
    .map(([path, keys]) => ({ fieldId: target(path), label: labelFor(path), message: message(keys[0]!) }))
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
      <PageSection {...sectionProps} />
      <GlanceSection {...sectionProps} />
      <BenefitsSection {...sectionProps} />
      <WhoSection {...sectionProps} />
      <HowSection {...sectionProps} />
      <RulesSection {...sectionProps} />
      <DocumentsSection {...sectionProps} />
      <FaqSection {...sectionProps} />
      <ApplySection {...sectionProps} />
    </PageEditorFrame>
  );
}
