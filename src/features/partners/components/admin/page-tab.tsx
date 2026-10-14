'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import type { MediaItem } from '@/features/media';
import { PageEditorFrame, usePageEditor } from '@/shared/admin-ui/page-editor';

import { savePartnersPage } from '../../actions/admin-partners';
import type { PartnersPageInput, PartnersPageRecord } from '../../types';
import { fieldId, type SectionProps } from './form-kit';
import {
  ContactSection,
  HeroSection,
  OfferSection,
  PackagesSection,
  ReachSection,
  SinglesSection,
  WallSection,
  WhySection,
} from './page-sections';

const SECTION_IDS = ['hero', 'reach', 'why', 'packages', 'singles', 'offer', 'wall', 'contact'] as const;

/** Where a field's summary line links to: a list-level error goes to the section. */
const target = (path: string): string => {
  const parts = path.split('.');
  if (parts[0] === 'why' && parts[1] === 'cards' && parts.length === 2) return 'why';
  if (parts[0] === 'reach' && parts[1] === 'stats' && parts.length === 2) return 'reach';
  if (parts[0] === 'packages' && parts[1] === 'singles' && parts.length === 2) return 'singles';
  if (parts[0] === 'packages' && parts[1] === 'items' && parts.length === 2) return 'packages';
  if (parts[0] === 'offer' && parts[1] === 'mediaId') return 'offer';
  return fieldId(path);
};

type Props = {
  record: PartnersPageRecord;
  /** The library files the content uses. */
  media: Record<string, MediaItem>;
  canEdit: boolean;
  /** The tabs of the page, placed under the header. */
  tabs: React.ReactNode;
};

/** The "Page" tab of /admin/pages/sponsors: one form, one "Save changes", sections with a sub-nav. */
export function PartnersPageEditor({ record, media: initialMedia, canEdit, tabs }: Props) {
  const t = useTranslations('admin.partners');
  const [media, setMedia] = React.useState(initialMedia);
  const editor = usePageEditor<PartnersPageInput>({
    record,
    save: savePartnersPage,
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
    const known = ['required', 'tooLong', 'tooMany', 'tooFew', 'email', 'oneHighlight'];
    return t(`errors.${known.includes(key) ? key : 'unexpected'}` as Parameters<typeof t>[0]);
  };
  const error = (path: string) => {
    const key = editor.errorKey(path);
    return key ? message(key) : undefined;
  };

  // "packages.items.1.name.mk" → "Package 2 › Name": the section, the row number and the field.
  const labelFor = (path: string): string => {
    const [head = '', a = '', b = '', c = '', d = ''] = path.split('.');
    const row = (section: string, index: string) => `${section} ${Number(index) + 1}`;
    switch (head) {
      case 'hero':
        return t(`hero.${a as 'title'}`);
      case 'reach':
        return a === 'title'
          ? t('reach.title')
          : `${row(t('sections.reach'), b)} › ${t(`reach.${(c || 'value') as 'value'}`)}`;
      case 'why':
        return a === 'cards'
          ? `${row(t('sections.why'), b)} › ${t(`cards.${(c || 'title') as 'title'}`)}`
          : t(`why.${a as 'title'}`);
      case 'packages':
        if (a === 'items')
          return c === 'items'
            ? `${row(t('packages.package'), b)} › ${t('packages.contentsItem', { number: Number(d) + 1 })}`
            : `${row(t('packages.package'), b)} › ${t(`packages.${(c || 'name') as 'name'}`)}`;
        if (a === 'singles')
          return `${row(t('sections.singles'), b)} › ${t(`cards.${(c || 'title') as 'title'}`)}`;
        return a === 'singlesTitle' ? t('singles.title') : t(`packages.${a as 'title'}`);
      case 'offer':
        return a === 'mediaId' ? t('offer.file') : t(`offer.${a as 'title'}`);
      case 'partners':
        return t(`wall.${a as 'title'}`);
      case 'contact':
        return a === 'person'
          ? t(`contact.person${b[0]!.toUpperCase()}${b.slice(1)}` as 'contact.personName')
          : t(`contact.${a as 'title'}`);
      default:
        return path;
    }
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
      aboveContent={tabs}
    >
      <HeroSection {...sectionProps} />
      <ReachSection {...sectionProps} />
      <WhySection {...sectionProps} />
      <PackagesSection {...sectionProps} />
      <SinglesSection {...sectionProps} />
      <OfferSection {...sectionProps} />
      <WallSection {...sectionProps} />
      <ContactSection {...sectionProps} />
    </PageEditorFrame>
  );
}
