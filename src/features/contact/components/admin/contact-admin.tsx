'use client';

import { useTranslations } from 'next-intl';
import type * as React from 'react';

import { PageEditorFrame, usePageEditor } from '@/shared/admin-ui/page-editor';

import { saveContactPage } from '../../actions/admin-contact';
import type { ContactPageInput, ContactPageRecord } from '../../types';
import { fieldId, type SectionProps } from './form-kit';
import { MapSection, PageSection, ShortcutsSection, SubjectsSection } from './sections';

const SECTION_IDS = ['page', 'shortcuts', 'subjects', 'map'] as const;

/** /admin/pages/contact (spec 10 › Admin-managed data): one form, one "Save changes", sections with a sub-nav. */
export function ContactAdmin({
  record,
  canEdit,
  tabs,
}: {
  record: ContactPageRecord;
  canEdit: boolean;
  /** The tabs of the page (Page · Privacy policy), shown above the form. */
  tabs?: React.ReactNode;
}) {
  const t = useTranslations('admin.contact');
  const editor = usePageEditor<ContactPageInput>({
    record,
    save: saveContactPage,
    messages: {
      saved: t('savedToast'),
      forbidden: t('errors.forbidden'),
      unexpected: t('errors.unexpected'),
    },
  });

  const message = (key: string): string => {
    const known = ['required', 'tooLong', 'tooMany', 'tooFew', 'url', 'email', 'number', 'range'];
    return t(`errors.${known.includes(key) ? key : 'unexpected'}` as Parameters<typeof t>[0]);
  };
  const error = (path: string) => {
    const key = editor.errorKey(path);
    return key ? message(key) : undefined;
  };

  // "subjects.2.routeEmail" → "Subject 3 › Route e-mail": the section, the row number and the field.
  const labelFor = (path: string): string => {
    const [head = '', a = '', b = ''] = path.split('.');
    const row = (section: string) => `${section} ${Number(a) + 1}`;
    switch (head) {
      case 'hero':
        return t(`page.${a as 'title'}`);
      case 'form':
        return t(`page.${a === 'title' ? 'formTitle' : 'formIntro'}`);
      case 'headings':
        return t('page.headingOf', { section: t(`headings.${a as 'info'}`) });
      case 'shortcuts':
        return `${row(t('shortcuts.item'))}${b ? ` › ${t(`shortcuts.${b as 'label'}`)}` : ''}`;
      case 'subjects':
        return `${row(t('subjects.item'))}${b ? ` › ${t(`subjects.${b as 'name'}`)}` : ''}`;
      case 'map':
        return t(`map.${a as 'lat'}`);
      default:
        return path;
    }
  };

  // The field a summary line links to: a list-level error goes to the section.
  const target = (path: string) => {
    const parts = path.split('.');
    return (parts[0] === 'shortcuts' || parts[0] === 'subjects') && parts.length === 1
      ? parts[0]
      : fieldId(path);
  };

  // One summary line per field (a localized field reports once, for MK).
  const summary = Object.entries(editor.fieldErrors)
    .filter(([path]) => !path.endsWith('.en'))
    .map(([path, keys]) => ({ fieldId: target(path), label: labelFor(path), message: message(keys[0]!) }))
    .filter((item, index, all) => all.findIndex((other) => other.fieldId === item.fieldId) === index);

  const sectionProps: SectionProps = { values: editor.values, update: editor.update, error };

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
      aboveContent={tabs}
    >
      <PageSection {...sectionProps} />
      <ShortcutsSection {...sectionProps} />
      <SubjectsSection {...sectionProps} />
      <MapSection {...sectionProps} />
    </PageEditorFrame>
  );
}
