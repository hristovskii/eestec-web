'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { MediaPicker } from '@/features/media/admin';
import { ChipMultiSelect } from '@/shared/admin-ui/chip-multi-select';
import { FormSection, SwitchRow } from '@/shared/admin-ui/form-section';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import { LocalizedRichTextField, type PickImage } from '@/shared/admin-ui/rich-text-editor';
import { SlugField } from '@/shared/admin-ui/slug-field';
import { SortableList } from '@/shared/admin-ui/sortable-list';
import { isoToZoned, zonedToIso } from '@/shared/lib/zoned-time';
import type { Localized } from '@/shared/types/localized';
import { FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { EVENT_LIMITS } from '../../../schemas/event.schema';
import { numberValue, parseNumber, useEventForm } from './form-kit';

const inputClass = 'md:text-small';

/** A label with the grey "Optional" note (`.label .opt`). */
export function OptionalLabel({ children }: { children: React.ReactNode }) {
  const t = useTranslations('admin.events.edit.fields');
  return (
    <>
      {children} <span className="font-normal text-muted-ink">{t('optional')}</span>
    </>
  );
}

export function BasicInfoSection({ onSlugEdited }: { onSlugEdited: () => void }) {
  const t = useTranslations('admin.events.edit');
  const { values, update, error, timing, isNew, fieldId } = useEventForm();
  return (
    <FormSection id="s-basic" title={t('sections.basic')}>
      <LocalizedField
        id={fieldId('title')}
        label={t('fields.title')}
        required
        maxLength={EVENT_LIMITS.title}
        help={t('fields.titleHelp')}
        placeholder={t('fields.titlePlaceholder')}
        value={values.title}
        onChange={(title) => update((draft) => void (draft.title = title))}
        error={error('title.mk') ?? error('title.en')}
      />
      <SlugField
        id={fieldId('slug')}
        label={t('fields.slug')}
        prefix={`eestec.mk/${timing === 'upcoming' ? 'upcoming' : 'events'}/`}
        value={values.slug}
        onChange={(slug) => {
          onSlugEdited();
          update((draft) => void (draft.slug = slug));
        }}
        error={error('slug')}
        help={isNew ? <SlugNewHelp /> : undefined}
      />
      <LocalizedField
        id={fieldId('shortDescription')}
        label={t('fields.shortDescription')}
        required
        multiline
        rows={2}
        maxLength={EVENT_LIMITS.shortDescription}
        help={t('fields.shortDescriptionHelp')}
        value={values.shortDescription}
        onChange={(value) => update((draft) => void (draft.shortDescription = value))}
        error={error('shortDescription.mk') ?? error('shortDescription.en')}
      />
    </FormSection>
  );
}

function SlugNewHelp() {
  const t = useTranslations('admin.ui.slug');
  return <>{t('helpNew')}</>;
}

/** Date + time inputs in Skopje time for one end of the event. */
function DateTimeInputs({ which }: { which: 'startsAt' | 'endsAt' }) {
  const t = useTranslations('admin.events.edit.fields');
  const { values, update, error, fieldId } = useEventForm();
  const { date, time } = isoToZoned(values[which]);
  const set = (nextDate: string, nextTime: string) => {
    const iso = zonedToIso(nextDate, nextTime);
    // An incomplete date (while typing) keeps the last valid value.
    if (iso) update((draft) => void (draft[which] = iso));
  };
  const id = fieldId(which);
  return (
    <>
      <FormField
        id={id}
        label={which === 'startsAt' ? t('startDate') : t('endDate')}
        required
        error={error(which)}
      >
        {(control) => (
          <Input
            {...control}
            type="date"
            value={date}
            onChange={(event) =>
              set(event.target.value, values.allDay ? (which === 'startsAt' ? '00:00' : '23:59') : time)
            }
            className={inputClass}
          />
        )}
      </FormField>
      {!values.allDay && (
        <FormField id={`${id}-time`} label={which === 'startsAt' ? t('startTime') : t('endTime')}>
          {(control) => (
            <Input
              {...control}
              type="time"
              value={time}
              onChange={(event) => set(date, event.target.value)}
              className={inputClass}
            />
          )}
        </FormField>
      )}
    </>
  );
}

export function DatePlaceSection() {
  const t = useTranslations('admin.events.edit');
  const { values, update, error, fieldId } = useEventForm();
  const otherOrganizer = values.organizer !== null;
  const setAllDay = (allDay: boolean) =>
    update((draft) => {
      draft.allDay = allDay;
      const start = isoToZoned(draft.startsAt);
      const end = isoToZoned(draft.endsAt);
      draft.startsAt = zonedToIso(start.date, allDay ? '00:00' : '10:00') ?? draft.startsAt;
      draft.endsAt = zonedToIso(end.date, allDay ? '23:59' : '18:00') ?? draft.endsAt;
    });

  return (
    <FormSection id="s-when" title={t('sections.when')}>
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1.4fr_1fr]">
        <DateTimeInputs which="startsAt" />
        <DateTimeInputs which="endsAt" />
      </div>
      <SwitchRow
        id={fieldId('allDay')}
        label={t('fields.allDay')}
        checked={values.allDay}
        onChange={setAllDay}
        className="w-fit flex-row-reverse"
      />
      <div className="grid gap-3.5 sm:grid-cols-2">
        <LocalizedField
          id={fieldId('location')}
          label={t('fields.location')}
          required
          maxLength={EVENT_LIMITS.location}
          placeholder={t('fields.locationPlaceholder')}
          value={values.location}
          onChange={(location) => update((draft) => void (draft.location = location))}
          error={error('location.mk') ?? error('location.en')}
        />
        <div className="flex flex-col gap-3">
          <FormField id={fieldId('organizer')} label={t('fields.organizer')}>
            {(control) => (
              <NativeSelect
                {...control}
                value={otherOrganizer ? 'other' : 'lc'}
                onChange={(event) =>
                  update((draft) => void (draft.organizer = event.target.value === 'other' ? '' : null))
                }
                className="[&_select]:md:text-small"
              >
                <NativeSelectOption value="lc">{t('fields.organizerLc')}</NativeSelectOption>
                <NativeSelectOption value="other">{t('fields.organizerOther')}</NativeSelectOption>
              </NativeSelect>
            )}
          </FormField>
          {otherOrganizer && (
            <FormField
              id={`${fieldId('organizer')}-name`}
              label={t('fields.organizerName')}
              error={error('organizer')}
            >
              {(control) => (
                <Input
                  {...control}
                  value={values.organizer ?? ''}
                  placeholder={t('fields.organizerNamePlaceholder')}
                  maxLength={EVENT_LIMITS.organizer}
                  onChange={(event) => update((draft) => void (draft.organizer = event.target.value))}
                  className={inputClass}
                />
              )}
            </FormField>
          )}
        </div>
        <LocalizedField
          id={fieldId('city')}
          label={t('fields.city')}
          help={t('fields.cityHelp')}
          value={values.city}
          onChange={(city) => update((draft) => void (draft.city = city))}
          error={error('city.mk') ?? error('city.en')}
        />
        <LocalizedField
          id={fieldId('country')}
          label={t('fields.country')}
          value={values.country}
          onChange={(country) => update((draft) => void (draft.country = country))}
          error={error('country.mk') ?? error('country.en')}
        />
      </div>
    </FormSection>
  );
}

/** Opens the Media library to put an image into rich text (images with a file and alt text). */
function useImagePicker(): { pickImage: PickImage; picker: React.ReactNode } {
  const [pending, setPending] = React.useState<((image: { src: string; alt: string }) => void) | null>(null);
  return {
    pickImage: (insert) => setPending(() => insert),
    picker: (
      <MediaPicker
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        onPick={(item) => {
          if (item.src) pending?.({ src: item.src, alt: item.alt ?? '' });
          setPending(null);
        }}
      />
    ),
  };
}

export function DescriptionSection() {
  const t = useTranslations('admin.events.edit');
  const { values, update, error, fieldId } = useEventForm();
  const { pickImage, picker } = useImagePicker();
  return (
    <FormSection id="s-desc" title={t('sections.description')} aside={t('sections.descriptionAside')}>
      <LocalizedRichTextField
        id={fieldId('description')}
        label={t('fields.description')}
        value={values.description}
        onChange={(description) => update((draft) => void (draft.description = description))}
        error={error('description.mk') ?? error('description.en')}
        pickImage={pickImage}
      />
      {picker}
    </FormSection>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function ProgrammeSection() {
  const t = useTranslations('admin.events.edit');
  const { values, update, error, fieldId } = useEventForm();
  const startDay = isoToZoned(values.startsAt).date;
  const dayNumber = (date: string | null, index: number) =>
    date
      ? Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${startDay}T12:00:00Z`)) / DAY_MS) + 1
      : index + 1;

  const add = () =>
    update((draft) => {
      const last = draft.agenda.at(-1)?.date ?? null;
      const next = new Date(Date.parse(`${last ?? startDay}T12:00:00Z`) + (last ? DAY_MS : 0));
      draft.agenda.push({
        id: `agenda-${crypto.randomUUID().slice(0, 8)}`,
        date: next.toISOString().slice(0, 10),
        title: { mk: '' },
        text: { mk: '' },
      });
    });
  const set = (index: number, patch: (item: (typeof values.agenda)[number]) => void) =>
    update((draft) => patch(draft.agenda[index]!));

  return (
    <FormSection id="s-programme" title={t('sections.programme')} aside={t('sections.programmeAside')}>
      {values.agenda.length === 0 ? (
        <p className="text-small text-muted-ink">{t('fields.agendaEmpty')}</p>
      ) : (
        <SortableList
          items={values.agenda}
          onReorder={(items) => update((draft) => void (draft.agenda = items))}
          label={t('sections.programme')}
          itemName={(item) => t('fields.agendaItem', { number: values.agenda.indexOf(item) + 1 })}
          className="-mx-4 border-t border-divider md:-mx-5"
          renderItem={(item, handle) => {
            const index = values.agenda.indexOf(item);
            const label = t('fields.agendaDay', { number: dayNumber(item.date, index) });
            return (
              <div className="flex gap-2 border-b border-divider px-2 py-3.5 md:px-3">
                {handle}
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
                  <div className="flex flex-col gap-1">
                    <strong className="text-small">{label}</strong>
                    <FormField id={`${fieldId(`agenda.${index}`)}-date`} label={t('fields.agendaDate')}>
                      {(control) => (
                        <Input
                          {...control}
                          type="date"
                          value={item.date ?? ''}
                          onChange={(event) =>
                            set(index, (draft) => void (draft.date = event.target.value || null))
                          }
                          className={inputClass}
                        />
                      )}
                    </FormField>
                  </div>
                  <div className="flex flex-col gap-3">
                    <LocalizedField
                      id={fieldId(`agenda.${index}.title`)}
                      label={t('fields.agendaTitle')}
                      required
                      maxLength={EVENT_LIMITS.agendaTitle}
                      value={item.title}
                      onChange={(title) => set(index, (draft) => void (draft.title = title))}
                      error={error(`agenda.${index}.title.mk`)}
                    />
                    <LocalizedField
                      id={fieldId(`agenda.${index}.text`)}
                      label={t('fields.agendaText')}
                      multiline
                      rows={2}
                      maxLength={EVENT_LIMITS.agendaText}
                      value={item.text}
                      onChange={(text) => set(index, (draft) => void (draft.text = text))}
                      error={error(`agenda.${index}.text.mk`)}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label={t('fields.agendaRemove', { name: label })}
                  onClick={() => update((draft) => void draft.agenda.splice(index, 1))}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            );
          }}
        />
      )}
      <Button variant="quiet" size="sm" className="w-fit" onClick={add}>
        <Plus aria-hidden />
        {t('fields.agendaAdd')}
      </Button>
    </FormSection>
  );
}

export function PracticalSection() {
  const t = useTranslations('admin.events.edit');
  const { values, update, error, fieldId } = useEventForm();
  const setFee = (key: 'price' | 'note') => (value: Localized) =>
    update((draft) => void (draft.fee[key] = value));
  return (
    <FormSection id="s-practical" title={t('sections.practical')} aside={t('sections.practicalAside')}>
      <LocalizedRichTextField
        id={fieldId('requirements')}
        label={t('fields.requirements')}
        help={t('fields.requirementsHelp')}
        minHeight={120}
        value={values.requirements}
        onChange={(requirements) => update((draft) => void (draft.requirements = requirements))}
        error={error('requirements.mk') ?? error('requirements.en')}
      />
      <div className="grid gap-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <LocalizedField
          id={fieldId('fee.price')}
          label={t('fields.feePrice')}
          help={t('fields.feePriceHelp')}
          maxLength={EVENT_LIMITS.feePrice}
          value={values.fee.price}
          onChange={setFee('price')}
          error={error('fee.price.mk') ?? error('fee.price.en')}
        />
        <LocalizedField
          id={fieldId('fee.note')}
          label={t('fields.feeNote')}
          multiline
          rows={2}
          maxLength={EVENT_LIMITS.feeNote}
          value={values.fee.note}
          onChange={setFee('note')}
          error={error('fee.note.mk') ?? error('fee.note.en')}
        />
      </div>
      <FormField
        id={fieldId('contactEmail')}
        label={<OptionalLabel>{t('fields.contactEmail')}</OptionalLabel>}
        help={t('fields.contactEmailHelp')}
        error={error('contactEmail')}
      >
        {(control) => (
          <Input
            {...control}
            type="email"
            value={values.contactEmail}
            onChange={(event) => update((draft) => void (draft.contactEmail = event.target.value.trim()))}
            className={`${inputClass} sm:max-w-[360px]`}
          />
        )}
      </FormField>
    </FormSection>
  );
}

export function TopicsSection({
  topics,
  onCreateTopic,
}: {
  topics: { id: string; name: Localized }[];
  onCreateTopic?: (name: string) => Promise<{ id: string; label: string } | { error: string }>;
}) {
  const t = useTranslations('admin.events.edit');
  const { values, update, error, fieldId } = useEventForm();
  return (
    <FormSection id="s-topics" title={t('sections.topics')} aside={t('sections.topicsAside')}>
      <ChipMultiSelect
        label={t('fields.topics')}
        options={topics.map((topic) => ({ id: topic.id, label: topic.name.mk }))}
        value={values.topicIds}
        onChange={(ids) => update((draft) => void (draft.topicIds = ids))}
        onCreate={onCreateTopic}
      />
      {error('topicIds') && (
        <p id={fieldId('topicIds')} role="alert" className="text-small font-medium text-brand-dark">
          {error('topicIds')}
        </p>
      )}
    </FormSection>
  );
}

export function AfterEventSection() {
  const t = useTranslations('admin.events.edit');
  const { values, update, error, fieldId } = useEventForm();
  const number = (key: 'participantCount' | 'countryCount', label: string) => (
    <FormField id={fieldId(key)} label={label} error={error(key)}>
      {(control) => (
        <Input
          {...control}
          type="number"
          inputMode="numeric"
          min={0}
          value={numberValue(values[key])}
          onChange={(event) => update((draft) => void (draft[key] = parseNumber(event.target.value)))}
          className={`${inputClass} w-[120px]`}
        />
      )}
    </FormField>
  );
  return (
    <FormSection id="s-after" title={t('sections.after')} aside={t('sections.afterAside')}>
      <div className="flex flex-wrap gap-3.5">
        {number('participantCount', t('fields.participants'))}
        {number('countryCount', t('fields.countries'))}
      </div>
      <p className="-mt-2 text-small text-muted-ink">{t('fields.participantsHelp')}</p>
    </FormSection>
  );
}
