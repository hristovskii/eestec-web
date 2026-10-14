'use client';

import { useTranslations } from 'next-intl';
import type * as React from 'react';

import { FormSection, SwitchRow } from '@/shared/admin-ui/form-section';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import { PageEditorFrame, usePageEditor } from '@/shared/admin-ui/page-editor';
import { LocalizedRichTextField } from '@/shared/admin-ui/rich-text-editor';

import { savePrivacy } from '../../actions/admin-privacy';
import { PRIVACY_LIMITS } from '../../schemas/privacy.schema';
import type { PrivacyInput, PrivacyRecord } from '../../types';

const TITLE_ID = 'pv-title';
const BODY_ID = 'pv-body';

/** /admin/pages/contact?tab=privacy: the title and the text of /privacy (rich text, both languages). */
export function PrivacyAdmin({
  record,
  canEdit,
  tabs,
}: {
  record: PrivacyRecord;
  canEdit: boolean;
  /** The tabs of the Contact page editor, shown above the form. */
  tabs?: React.ReactNode;
}) {
  const t = useTranslations('admin.privacy');
  const editor = usePageEditor<PrivacyInput>({
    record,
    save: savePrivacy,
    messages: {
      saved: t('savedToast'),
      forbidden: t('errors.forbidden'),
      unexpected: t('errors.unexpected'),
    },
  });
  const { values, update } = editor;

  const message = (key: string): string => {
    const known = ['required', 'tooLong'];
    return t(`errors.${known.includes(key) ? key : 'unexpected'}` as Parameters<typeof t>[0]);
  };
  const error = (path: string) => {
    const key = editor.errorKey(path);
    return key ? message(key) : undefined;
  };

  // One summary line per field (a localized field reports once, for MK).
  const summary = Object.entries(editor.fieldErrors)
    .filter(([path]) => !path.endsWith('.en'))
    .map(([path, keys]) => ({
      fieldId: path.startsWith('body') ? BODY_ID : TITLE_ID,
      label: path.startsWith('body') ? t('body') : t('title'),
      message: message(keys[0]!),
    }));

  return (
    <PageEditorFrame
      editor={editor}
      title={t('pageTitle')}
      description={t('description')}
      canEdit={canEdit}
      readOnlyNote={t('readOnly')}
      sections={[{ id: 'policy', label: t('sections.policy') }]}
      sectionsNavLabel={t('sectionsNav')}
      errors={summary}
      errorSummaryTitle={t('errorSummary', { count: summary.length })}
      aboveContent={tabs}
    >
      <FormSection id="policy" title={t('sections.policy')} aside={t('aside')}>
        <LocalizedField
          id={TITLE_ID}
          label={t('title')}
          required
          value={values.title}
          onChange={(value) => update((draft) => void (draft.title = value))}
          error={error('title.mk')}
          maxLength={PRIVACY_LIMITS.title}
        />
        <LocalizedRichTextField
          id={BODY_ID}
          label={t('body')}
          required
          aside={t('bodyAside')}
          help={t('bodyHelp')}
          value={values.body}
          onChange={(value) => update((draft) => void (draft.body = value))}
          error={error('body.mk')}
          minHeight={320}
        />
        <div className="flex flex-col gap-1.5 rounded-md bg-surface p-3.5">
          <SwitchRow
            id="pv-placeholder"
            label={t('placeholder')}
            checked={values.isPlaceholder}
            onChange={(isPlaceholder) => update((draft) => void (draft.isPlaceholder = isPlaceholder))}
          />
          <p className="text-[13px] text-muted-ink">{t('placeholderHelp')}</p>
        </div>
      </FormSection>
    </PageEditorFrame>
  );
}
