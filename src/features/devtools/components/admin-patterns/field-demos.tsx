'use client';

import * as React from 'react';

import { ChipMultiSelect } from '@/shared/admin-ui/chip-multi-select';
import { FormSection } from '@/shared/admin-ui/form-section';
import { LocalizedRichTextField } from '@/shared/admin-ui/rich-text-editor';
import { SlugField } from '@/shared/admin-ui/slug-field';
import { SortableList } from '@/shared/admin-ui/sortable-list';
import type { Localized } from '@/shared/types/localized';

// SAMPLE DATA from handoff/design-source/AdminEventEdit.dc.html (topics, description, gallery).
const TOPICS = [
  'Hardware',
  'AI & data',
  'Software',
  'Power & energy',
  'Telecom',
  'Soft skills',
  'Career',
].map((label) => ({ id: label, label }));
const DESCRIPTION =
  '<h3>About the workshop</h3><p>Most AI runs in big data centres. This workshop is about the opposite: <strong>small models that run on a €10 board</strong>, with no internet connection.</p><ul><li><p>A full lab day and a company visit</p></li><li><p>A team challenge and a day trip to Ohrid</p></li></ul>';
const PHOTOS = ['Opening session', 'Students wiring a sensor', 'Team presenting', 'Lab bench'].map(
  (alt, index) => ({
    id: `photo-${index + 1}`,
    alt,
  }),
);

/** The edit-form field patterns of AdminEventEdit, with sample values. Nothing is saved. */
export function FieldDemos() {
  const [slug, setSlug] = React.useState('ai-at-the-edge');
  const [topics, setTopics] = React.useState(['Hardware', 'AI & data']);
  const [options, setOptions] = React.useState(TOPICS);
  const [description, setDescription] = React.useState<Localized>({ mk: DESCRIPTION });
  const [photos, setPhotos] = React.useState(PHOTOS);

  return (
    <div className="flex flex-col gap-4">
      <FormSection id="lab-basic" title="Basic info" aside="SlugField">
        <SlugField
          id="lab-slug"
          label="Page address"
          prefix="eestec.mk/upcoming/"
          value={slug}
          onChange={setSlug}
        />
      </FormSection>
      <FormSection id="lab-desc" title="Description" aside="LocalizedRichTextField (Tiptap)">
        <LocalizedRichTextField
          id="lab-description"
          label="Description"
          value={description}
          onChange={setDescription}
        />
      </FormSection>
      <FormSection id="lab-topics" title="Topics" aside="ChipMultiSelect">
        <ChipMultiSelect
          label="Topics"
          options={options}
          value={topics}
          onChange={setTopics}
          onCreate={(name) => {
            const option = { id: name, label: name };
            setOptions((list) => [...list, option]);
            return Promise.resolve(option);
          }}
        />
      </FormSection>
      <FormSection id="lab-gallery" title="Photo gallery" aside="SortableList layout=grid">
        <SortableList
          layout="grid"
          items={photos}
          onReorder={setPhotos}
          label="Photo gallery"
          itemName={(photo) => photo.alt}
          className="grid grid-cols-2 gap-3.5 sm:grid-cols-4"
          renderItem={(photo, handle) => (
            <div className="flex flex-col gap-1.5">
              <div className="relative aspect-[4/3] rounded-sm border border-line bg-[repeating-linear-gradient(135deg,var(--color-divider)_0_10px,var(--color-line)_10px_20px)]">
                <span className="absolute top-1.5 left-1.5 rounded-sm bg-white/95">{handle}</span>
                <span className="absolute top-1.5 right-1.5 flex h-5.5 min-w-5.5 items-center justify-center rounded-full bg-ink px-1.5 text-[12px] font-bold text-white">
                  {photos.indexOf(photo) + 1}
                </span>
              </div>
              <span className="truncate text-[13px]">{photo.alt}</span>
            </div>
          )}
        />
      </FormSection>
    </div>
  );
}
