'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import { FormSection } from '@/shared/admin-ui/form-section';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import { AddRow, RowList } from '@/shared/admin-ui/row-list';
import { useFocusAdded } from '@/shared/admin-ui/use-focus-added';
import { resolveLocalized } from '@/shared/i18n/localized';
import { FormField } from '@/shared/ui/form/form-field';
import { Input } from '@/shared/ui/primitives/input';

import { CONTACT_LIMITS } from '../../schemas/contact-page.schema';
import { CONTACT_HEADINGS } from '../../types';
import { fieldId, newId, type SectionProps } from './form-kit';

const nameOf = (value: { mk: string; en?: string }, fallback: string) =>
  resolveLocalized(value, 'en').trim() || fallback;

// ─── Page texts ───

export function PageSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.contact.page');
  const tSections = useTranslations('admin.contact.sections');
  const tHeadings = useTranslations('admin.contact.headings');
  return (
    <FormSection id="page" title={tSections('page')} aside={t('aside')}>
      <LocalizedField
        id={fieldId('hero.title')}
        label={t('title')}
        required
        value={values.hero.title}
        onChange={(value) => update((draft) => void (draft.hero.title = value))}
        error={error('hero.title.mk')}
        maxLength={CONTACT_LIMITS.title}
      />
      <LocalizedField
        id={fieldId('hero.lead')}
        label={t('lead')}
        required
        multiline
        rows={2}
        value={values.hero.lead}
        onChange={(value) => update((draft) => void (draft.hero.lead = value))}
        error={error('hero.lead.mk')}
        maxLength={CONTACT_LIMITS.lead}
      />
      <LocalizedField
        id={fieldId('form.title')}
        label={t('formTitle')}
        required
        value={values.form.title}
        onChange={(value) => update((draft) => void (draft.form.title = value))}
        error={error('form.title.mk')}
        maxLength={CONTACT_LIMITS.formTitle}
      />
      <LocalizedField
        id={fieldId('form.intro')}
        label={t('formIntro')}
        help={t('formIntroHelp')}
        multiline
        rows={2}
        value={values.form.intro}
        onChange={(value) => update((draft) => void (draft.form.intro = value))}
        error={error('form.intro.mk')}
        maxLength={CONTACT_LIMITS.formIntro}
      />
      <div className="flex flex-col gap-3.5 rounded-md bg-surface p-3.5">
        <span className="text-small font-bold">{t('headings')}</span>
        <p className="text-[13px] text-muted-ink">{t('headingsHelp')}</p>
        {CONTACT_HEADINGS.map((key) => (
          <LocalizedField
            key={key}
            id={fieldId(`headings.${key}`)}
            label={t('headingOf', { section: tHeadings(key) })}
            required
            value={values.headings[key]}
            onChange={(value) => update((draft) => void (draft.headings[key] = value))}
            error={error(`headings.${key}.mk`)}
            maxLength={CONTACT_LIMITS.heading}
          />
        ))}
      </div>
    </FormSection>
  );
}

// ─── Shortcut cards next to the hero ───

export function ShortcutsSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.contact.shortcuts');
  const tSections = useTranslations('admin.contact.sections');
  const focusAdded = useFocusAdded(values.shortcuts.length);
  return (
    <FormSection id="shortcuts" title={tSections('shortcuts')} aside={t('aside')}>
      <RowList
        label={t('list')}
        items={values.shortcuts}
        onReorder={(items) => update((draft) => void (draft.shortcuts = items))}
        itemName={(item) => nameOf(item.label, t('new'))}
        removeLabel={(name) => t('remove', { name })}
        onRemove={(index) => update((draft) => void draft.shortcuts.splice(index, 1))}
        fields={(item, index) => (
          <>
            <LocalizedField
              id={fieldId(`shortcuts.${index}.eyebrow`)}
              label={t('eyebrow')}
              required
              value={item.eyebrow}
              onChange={(value) => update((draft) => void (draft.shortcuts[index]!.eyebrow = value))}
              error={error(`shortcuts.${index}.eyebrow.mk`)}
              maxLength={CONTACT_LIMITS.eyebrow}
            />
            <LocalizedField
              id={fieldId(`shortcuts.${index}.label`)}
              label={t('label')}
              required
              value={item.label}
              onChange={(value) => update((draft) => void (draft.shortcuts[index]!.label = value))}
              error={error(`shortcuts.${index}.label.mk`)}
              maxLength={CONTACT_LIMITS.label}
            />
            <FormField
              id={fieldId(`shortcuts.${index}.href`)}
              label={t('href')}
              required
              help={t('hrefHelp')}
              error={error(`shortcuts.${index}.href`)}
            >
              {(control) => (
                <Input
                  {...control}
                  value={item.href}
                  maxLength={CONTACT_LIMITS.href}
                  onChange={(event) =>
                    update((draft) => void (draft.shortcuts[index]!.href = event.target.value))
                  }
                />
              )}
            </FormField>
          </>
        )}
      />
      <AddRow
        label={t('add')}
        full={values.shortcuts.length >= CONTACT_LIMITS.shortcuts}
        fullText={t('full', { max: CONTACT_LIMITS.shortcuts })}
        error={error('shortcuts')}
        onAdd={() => {
          focusAdded(fieldId(`shortcuts.${values.shortcuts.length}.eyebrow`));
          update(
            (draft) =>
              void draft.shortcuts.push({
                id: newId('shortcut'),
                eyebrow: { mk: '' },
                label: { mk: '' },
                href: '',
              }),
          );
        }}
      />
    </FormSection>
  );
}

// ─── Subjects of the form ───

export function SubjectsSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.contact.subjects');
  const tSections = useTranslations('admin.contact.sections');
  const focusAdded = useFocusAdded(values.subjects.length);
  return (
    <FormSection id="subjects" title={tSections('subjects')} aside={t('aside')}>
      <p className="text-[13px] text-muted-ink">{t('help')}</p>
      <RowList
        label={t('list')}
        items={values.subjects}
        onReorder={(items) => update((draft) => void (draft.subjects = items))}
        itemName={(item) => nameOf(item.name, t('new'))}
        removeLabel={(name) => t('remove', { name })}
        onRemove={(index) => update((draft) => void draft.subjects.splice(index, 1))}
        fields={(item, index) => (
          <>
            <LocalizedField
              id={fieldId(`subjects.${index}.name`)}
              label={t('name')}
              required
              value={item.name}
              onChange={(value) => update((draft) => void (draft.subjects[index]!.name = value))}
              error={error(`subjects.${index}.name.mk`)}
              maxLength={CONTACT_LIMITS.subjectName}
            />
            <FormField
              id={fieldId(`subjects.${index}.routeEmail`)}
              label={t('routeEmail')}
              required
              help={t('routeEmailHelp')}
              error={error(`subjects.${index}.routeEmail`)}
            >
              {(control) => (
                <Input
                  {...control}
                  type="email"
                  inputMode="email"
                  value={item.routeEmail}
                  maxLength={CONTACT_LIMITS.email}
                  onChange={(event) =>
                    update((draft) => void (draft.subjects[index]!.routeEmail = event.target.value))
                  }
                />
              )}
            </FormField>
            <LocalizedField
              id={fieldId(`subjects.${index}.teamLabel`)}
              label={t('teamLabel')}
              required
              help={t('teamLabelHelp')}
              value={item.teamLabel}
              onChange={(value) => update((draft) => void (draft.subjects[index]!.teamLabel = value))}
              error={error(`subjects.${index}.teamLabel.mk`)}
              maxLength={CONTACT_LIMITS.team}
            />
            <div className="flex flex-col gap-3.5 rounded-md bg-surface p-3.5">
              <span className="text-small font-bold">{t('suggestion')}</span>
              <p className="text-[13px] text-muted-ink">{t('suggestionHelp')}</p>
              <LocalizedField
                id={fieldId(`subjects.${index}.routeNote`)}
                label={t('routeNote')}
                multiline
                rows={2}
                value={item.routeNote}
                onChange={(value) => update((draft) => void (draft.subjects[index]!.routeNote = value))}
                error={error(`subjects.${index}.routeNote.mk`)}
                maxLength={CONTACT_LIMITS.note}
              />
              <LocalizedField
                id={fieldId(`subjects.${index}.shortcutLabel`)}
                label={t('shortcutLabel')}
                value={item.shortcutLabel}
                onChange={(value) => update((draft) => void (draft.subjects[index]!.shortcutLabel = value))}
                error={error(`subjects.${index}.shortcutLabel.mk`)}
                maxLength={CONTACT_LIMITS.label}
              />
              <FormField
                id={fieldId(`subjects.${index}.shortcutUrl`)}
                label={t('shortcutUrl')}
                help={t('shortcutUrlHelp')}
                error={error(`subjects.${index}.shortcutUrl`)}
              >
                {(control) => (
                  <Input
                    {...control}
                    value={item.shortcutUrl}
                    maxLength={CONTACT_LIMITS.href}
                    onChange={(event) =>
                      update((draft) => void (draft.subjects[index]!.shortcutUrl = event.target.value))
                    }
                  />
                )}
              </FormField>
            </div>
          </>
        )}
      />
      <AddRow
        label={t('add')}
        full={values.subjects.length >= CONTACT_LIMITS.subjects}
        fullText={t('full', { max: CONTACT_LIMITS.subjects })}
        error={error('subjects')}
        onAdd={() => {
          focusAdded(fieldId(`subjects.${values.subjects.length}.name`));
          update(
            (draft) =>
              void draft.subjects.push({
                id: newId('subject'),
                name: { mk: '' },
                routeEmail: '',
                teamLabel: { mk: '' },
                routeNote: { mk: '' },
                shortcutLabel: { mk: '' },
                shortcutUrl: '',
              }),
          );
        }}
      />
    </FormSection>
  );
}

// ─── Map ───

const parseNumber = (text: string) => {
  const next = text.trim().replace(',', '.');
  return /^-?\d+(?:\.\d+)?$/.test(next) ? Number(next) : Number.NaN;
};

/** A number field that keeps what is typed ("41," is not a number yet) and reports a number, or NaN while it is not one. */
function NumberField({
  id,
  label,
  help,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  help?: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
}) {
  const [typed, setTyped] = React.useState<string | null>(null);
  // What was typed, as long as it is still the value (a saved or discarded draft changes it from outside).
  const shown =
    typed !== null && (Object.is(parseNumber(typed), value) || Number.isNaN(value))
      ? typed
      : Number.isNaN(value)
        ? ''
        : String(value);
  return (
    <FormField id={id} label={label} required help={help} error={error}>
      {(control) => (
        <Input
          {...control}
          inputMode="decimal"
          value={shown}
          onChange={(event) => {
            setTyped(event.target.value);
            onChange(parseNumber(event.target.value));
          }}
        />
      )}
    </FormField>
  );
}

export function MapSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.contact.map');
  const tSections = useTranslations('admin.contact.sections');
  const map = values.map;
  return (
    <FormSection id="map" title={tSections('map')} aside={t('aside')}>
      <LocalizedField
        id={fieldId('map.pinLabel')}
        label={t('pinLabel')}
        help={t('pinLabelHelp')}
        value={map.pinLabel}
        onChange={(value) => update((draft) => void (draft.map.pinLabel = value))}
        error={error('map.pinLabel.mk')}
        maxLength={CONTACT_LIMITS.pinLabel}
      />
      <LocalizedField
        id={fieldId('map.placeName')}
        label={t('placeName')}
        required
        value={map.placeName}
        onChange={(value) => update((draft) => void (draft.map.placeName = value))}
        error={error('map.placeName.mk')}
        maxLength={CONTACT_LIMITS.place}
      />
      <LocalizedField
        id={fieldId('map.placeAddress')}
        label={t('placeAddress')}
        value={map.placeAddress}
        onChange={(value) => update((draft) => void (draft.map.placeAddress = value))}
        error={error('map.placeAddress.mk')}
        maxLength={CONTACT_LIMITS.address}
      />
      <p className="text-[13px] text-muted-ink">{t('positionHelp')}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField
          id={fieldId('map.lat')}
          label={t('lat')}
          value={map.lat}
          onChange={(value) => update((draft) => void (draft.map.lat = value))}
          error={error('map.lat')}
        />
        <NumberField
          id={fieldId('map.lng')}
          label={t('lng')}
          value={map.lng}
          onChange={(value) => update((draft) => void (draft.map.lng = value))}
          error={error('map.lng')}
        />
        <NumberField
          id={fieldId('map.zoom')}
          label={t('zoom')}
          help={t('zoomHelp')}
          value={map.zoom}
          onChange={(value) => update((draft) => void (draft.map.zoom = value))}
          error={error('map.zoom')}
        />
      </div>
    </FormSection>
  );
}
