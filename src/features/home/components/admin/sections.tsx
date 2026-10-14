'use client';

import { Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { MediaRefField } from '@/features/media/admin';
import { FormSection, SwitchRow } from '@/shared/admin-ui/form-section';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import { SortableList } from '@/shared/admin-ui/sortable-list';
import { useFocusAdded } from '@/shared/admin-ui/use-focus-added';
import { resolveLocalized } from '@/shared/i18n/localized';
import { FieldError, FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { HOME_LIMITS } from '../../schemas/home.schema';
import { ACTIVITY_ICONS, type HomeButton } from '../../types';
import { ActivityIconView } from '../activity-icon';
import { fieldId, newId, type SectionProps } from './form-kit';

/** Text that is shown, or a "new" placeholder, as the name of a row for screen readers. */
const nameOf = (value: { mk: string; en?: string }, fallback: string) =>
  resolveLocalized(value, 'en').trim() || fallback;

// ─── Hero ───

function ButtonFields({
  path,
  title,
  value,
  onChange,
  error,
}: {
  path: 'hero.primary' | 'hero.secondary';
  title: string;
  value: HomeButton;
  onChange: (value: HomeButton) => void;
  error: SectionProps['error'];
}) {
  const t = useTranslations('admin.home.hero');
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 rounded-md border border-line p-3.5">
      <legend className="px-1.5 text-small font-bold">{title}</legend>
      <LocalizedField
        id={fieldId(`${path}.label`)}
        label={t('buttonLabel')}
        required
        value={value.label}
        onChange={(label) => onChange({ ...value, label })}
        error={error(`${path}.label.mk`)}
        maxLength={HOME_LIMITS.button}
      />
      <FormField
        id={fieldId(`${path}.href`)}
        label={t('buttonLink')}
        required
        help={t('buttonLinkHelp')}
        error={error(`${path}.href`)}
      >
        {(control) => (
          <Input
            {...control}
            autoComplete="off"
            value={value.href}
            placeholder="/join"
            onChange={(event) => onChange({ ...value, href: event.target.value })}
            className="md:text-small"
          />
        )}
      </FormField>
    </fieldset>
  );
}

export function HeroSection({ values, update, error, media, addMedia }: SectionProps) {
  const t = useTranslations('admin.home');
  const hero = values.hero;
  return (
    <FormSection id="hero" title={t('sections.hero')} aside={t('hero.aside')}>
      <LocalizedField
        id={fieldId('hero.eyebrow')}
        label={t('hero.eyebrow')}
        help={t('hero.eyebrowHelp')}
        value={hero.eyebrow}
        onChange={(value) => update((draft) => void (draft.hero.eyebrow = value))}
        error={error('hero.eyebrow.mk')}
        maxLength={HOME_LIMITS.eyebrow}
      />
      <LocalizedField
        id={fieldId('hero.headline')}
        label={t('hero.headline')}
        required
        value={hero.headline}
        onChange={(value) => update((draft) => void (draft.hero.headline = value))}
        error={error('hero.headline.mk')}
        maxLength={HOME_LIMITS.headline}
      />
      <LocalizedField
        id={fieldId('hero.subtitle')}
        label={t('hero.subtitle')}
        required
        multiline
        rows={3}
        value={hero.subtitle}
        onChange={(value) => update((draft) => void (draft.hero.subtitle = value))}
        error={error('hero.subtitle.mk')}
        maxLength={HOME_LIMITS.subtitle}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <ButtonFields
          path="hero.primary"
          title={t('hero.primary')}
          value={hero.primary}
          onChange={(value) => update((draft) => void (draft.hero.primary = value))}
          error={error}
        />
        <ButtonFields
          path="hero.secondary"
          title={t('hero.secondary')}
          value={hero.secondary}
          onChange={(value) => update((draft) => void (draft.hero.secondary = value))}
          error={error}
        />
      </div>
      <p className="text-[13px] text-muted-ink">{t('hero.countdownNote')}</p>
      <MediaRefField
        altId={fieldId('hero.image.alt')}
        altError={error('hero.image.alt.mk')}
        maxAlt={HOME_LIMITS.alt}
        label={t('hero.image')}
        value={hero.image}
        onChange={(image) => update((draft) => void (draft.hero.image = image))}
        media={media}
        addMedia={addMedia}
        empty={t('hero.imageEmpty')}
      />
    </FormSection>
  );
}

// ─── What is EESTEC ───

export function AboutSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.home.about');
  const tSections = useTranslations('admin.home.sections');
  return (
    <FormSection id="about" title={tSections('about')} aside={t('aside')}>
      <LocalizedField
        id={fieldId('about.body')}
        label={t('body')}
        required
        multiline
        rows={9}
        help={t('bodyHelp')}
        value={values.about.body}
        onChange={(value) => update((draft) => void (draft.about.body = value))}
        error={error('about.body.mk')}
        maxLength={HOME_LIMITS.about}
      />
    </FormSection>
  );
}

// ─── Activities ───

export function ActivitiesSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.home.activities');
  const tSections = useTranslations('admin.home.sections');
  const focusAdded = useFocusAdded(values.activities.length);
  const full = values.activities.length >= HOME_LIMITS.activities;

  return (
    <FormSection id="activities" title={tSections('activities')} aside={t('aside')}>
      {values.activities.length === 0 && <p className="text-small text-muted-ink">{t('empty')}</p>}
      <SortableList
        label={t('list')}
        items={values.activities}
        itemName={(activity) => nameOf(activity.title, t('new'))}
        onReorder={(items) => update((draft) => void (draft.activities = items))}
        className="flex flex-col gap-3"
        renderItem={(activity, handle) => {
          const index = values.activities.findIndex((candidate) => candidate.id === activity.id);
          const name = nameOf(activity.title, t('new'));
          return (
            <div className="grid grid-cols-[32px_minmax(0,1fr)_36px] items-start gap-2 rounded-md border border-line p-3">
              <span className="flex h-(--control-h) items-center">{handle}</span>
              <div className="flex min-w-0 flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
                  <FormField
                    id={fieldId(`activities.${index}.icon`)}
                    label={t('icon')}
                    error={error(`activities.${index}.icon`)}
                  >
                    {(control) => (
                      <div className="flex items-center gap-2">
                        <span className="flex size-(--control-h) shrink-0 items-center justify-center rounded-md bg-surface">
                          <ActivityIconView icon={activity.icon} className="size-5" />
                        </span>
                        <NativeSelect
                          {...control}
                          value={activity.icon}
                          onChange={(event) =>
                            update(
                              (draft) =>
                                void (draft.activities[index]!.icon = event.target
                                  .value as (typeof ACTIVITY_ICONS)[number]),
                            )
                          }
                          className="min-w-0 flex-1 [&_select]:md:text-small"
                        >
                          {ACTIVITY_ICONS.map((icon) => (
                            <NativeSelectOption key={icon} value={icon}>
                              {t(`icons.${icon}`)}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      </div>
                    )}
                  </FormField>
                  <LocalizedField
                    id={fieldId(`activities.${index}.title`)}
                    label={t('title')}
                    required
                    value={activity.title}
                    onChange={(value) => update((draft) => void (draft.activities[index]!.title = value))}
                    error={error(`activities.${index}.title.mk`)}
                    maxLength={HOME_LIMITS.activityTitle}
                  />
                </div>
                <LocalizedField
                  id={fieldId(`activities.${index}.text`)}
                  label={t('text')}
                  required
                  multiline
                  rows={3}
                  value={activity.text}
                  onChange={(value) => update((draft) => void (draft.activities[index]!.text = value))}
                  error={error(`activities.${index}.text.mk`)}
                  maxLength={HOME_LIMITS.activityText}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-muted-ink"
                aria-label={t('remove', { name })}
                onClick={() => update((draft) => void draft.activities.splice(index, 1))}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          );
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="quiet"
          size="sm"
          disabled={full}
          onClick={() => {
            const id = newId('act');
            focusAdded(fieldId(`activities.${values.activities.length}.title`));
            update(
              (draft) =>
                void draft.activities.push({ id, icon: 'users', title: { mk: '' }, text: { mk: '' } }),
            );
          }}
        >
          <Plus aria-hidden />
          {t('add')}
        </Button>
        {full && (
          <span className="text-[13px] text-muted-ink">{t('full', { max: HOME_LIMITS.activities })}</span>
        )}
      </div>
      {error('activities') && <FieldError>{error('activities')}</FieldError>}
    </FormSection>
  );
}

// ─── Timeline ───

export function TimelineSection({ values, update, error, media, addMedia }: SectionProps) {
  const t = useTranslations('admin.home.timeline');
  const tSections = useTranslations('admin.home.sections');
  const focusAdded = useFocusAdded(values.milestones.length);
  const full = values.milestones.length >= HOME_LIMITS.milestones;

  return (
    <FormSection id="timeline" title={tSections('timeline')} aside={t('aside')}>
      {values.milestones.length === 0 && <p className="text-small text-muted-ink">{t('empty')}</p>}
      <SortableList
        label={t('list')}
        items={values.milestones}
        itemName={(milestone) => `${milestone.year} ${nameOf(milestone.title, t('new'))}`}
        onReorder={(items) => update((draft) => void (draft.milestones = items))}
        className="flex flex-col gap-3"
        renderItem={(milestone, handle) => {
          const index = values.milestones.findIndex((candidate) => candidate.id === milestone.id);
          const name = `${milestone.year} ${nameOf(milestone.title, t('new'))}`;
          return (
            <div className="grid grid-cols-[32px_minmax(0,1fr)_36px] items-start gap-2 rounded-md border border-line p-3">
              <span className="flex h-(--control-h) items-center">{handle}</span>
              <div className="flex min-w-0 flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)]">
                  <FormField
                    id={fieldId(`milestones.${index}.year`)}
                    label={t('year')}
                    required
                    error={error(`milestones.${index}.year`)}
                  >
                    {(control) => (
                      <Input
                        {...control}
                        inputMode="numeric"
                        autoComplete="off"
                        value={Number.isNaN(milestone.year) ? '' : String(milestone.year)}
                        onChange={(event) =>
                          update(
                            (draft) =>
                              void (draft.milestones[index]!.year =
                                event.target.value.trim() === '' ? Number.NaN : Number(event.target.value)),
                          )
                        }
                        className="md:text-small"
                      />
                    )}
                  </FormField>
                  <LocalizedField
                    id={fieldId(`milestones.${index}.title`)}
                    label={t('title')}
                    required
                    value={milestone.title}
                    onChange={(value) => update((draft) => void (draft.milestones[index]!.title = value))}
                    error={error(`milestones.${index}.title.mk`)}
                    maxLength={HOME_LIMITS.milestoneTitle}
                  />
                </div>
                <LocalizedField
                  id={fieldId(`milestones.${index}.text`)}
                  label={t('text')}
                  required
                  multiline
                  rows={3}
                  value={milestone.text}
                  onChange={(value) => update((draft) => void (draft.milestones[index]!.text = value))}
                  error={error(`milestones.${index}.text.mk`)}
                  maxLength={HOME_LIMITS.milestoneText}
                />
                <MediaRefField
                  altId={fieldId(`milestones.${index}.photo.alt`)}
                  altError={error(`milestones.${index}.photo.alt.mk`)}
                  maxAlt={HOME_LIMITS.alt}
                  label={t('photo')}
                  value={milestone.photo}
                  onChange={(photo) => update((draft) => void (draft.milestones[index]!.photo = photo))}
                  media={media}
                  addMedia={addMedia}
                  empty={t('photoEmpty')}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-muted-ink"
                aria-label={t('remove', { name })}
                onClick={() => update((draft) => void draft.milestones.splice(index, 1))}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          );
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="quiet"
          size="sm"
          disabled={full}
          onClick={() => {
            const id = newId('ms');
            focusAdded(fieldId(`milestones.${values.milestones.length}.year`));
            update(
              (draft) =>
                void draft.milestones.push({
                  id,
                  year: new Date().getFullYear(),
                  title: { mk: '' },
                  text: { mk: '' },
                  photo: null,
                }),
            );
          }}
        >
          <Plus aria-hidden />
          {t('add')}
        </Button>
        {full && (
          <span className="text-[13px] text-muted-ink">{t('full', { max: HOME_LIMITS.milestones })}</span>
        )}
      </div>
      {error('milestones') && <FieldError>{error('milestones')}</FieldError>}
    </FormSection>
  );
}

// ─── Statistics ───

export function StatsSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.home.stats');
  const tSections = useTranslations('admin.home.sections');
  const focusAdded = useFocusAdded(values.stats.length);
  const full = values.stats.length >= HOME_LIMITS.stats;

  return (
    <FormSection
      id="stats"
      title={tSections('stats')}
      aside={
        <>
          {t.rich('aside', {
            link: (chunks) => (
              <Link href="/admin/pages/map" className="font-medium text-brand-dark">
                {chunks}
              </Link>
            ),
          })}
        </>
      }
    >
      {values.stats.length === 0 && <p className="text-small text-muted-ink">{t('empty')}</p>}
      <SortableList
        label={t('list')}
        items={values.stats}
        itemName={(stat) => nameOf(stat.label, t('new'))}
        onReorder={(items) => update((draft) => void (draft.stats = items))}
        className="flex flex-col gap-3"
        renderItem={(stat, handle) => {
          const index = values.stats.findIndex((candidate) => candidate.id === stat.id);
          const name = nameOf(stat.label, t('new'));
          return (
            <div className="grid grid-cols-[32px_minmax(0,1fr)_36px] items-start gap-2 rounded-md border border-line p-3">
              <span className="flex h-(--control-h) items-center">{handle}</span>
              <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_130px_90px]">
                <LocalizedField
                  id={fieldId(`stats.${index}.label`)}
                  label={t('label')}
                  required
                  value={stat.label}
                  onChange={(value) => update((draft) => void (draft.stats[index]!.label = value))}
                  error={error(`stats.${index}.label.mk`)}
                  maxLength={HOME_LIMITS.statLabel}
                />
                <FormField
                  id={fieldId(`stats.${index}.value`)}
                  label={t('value')}
                  required
                  error={error(`stats.${index}.value`)}
                >
                  {(control) => (
                    <Input
                      {...control}
                      inputMode="numeric"
                      autoComplete="off"
                      value={Number.isNaN(stat.value) ? '' : String(stat.value)}
                      onChange={(event) =>
                        update(
                          (draft) =>
                            void (draft.stats[index]!.value =
                              event.target.value.trim() === ''
                                ? Number.NaN
                                : Number(event.target.value.replace(/[\s,]/g, ''))),
                        )
                      }
                      className="md:text-small"
                    />
                  )}
                </FormField>
                <FormField
                  id={fieldId(`stats.${index}.suffix`)}
                  label={t('suffix')}
                  help={t('suffixHelp')}
                  error={error(`stats.${index}.suffix`)}
                >
                  {(control) => (
                    <Input
                      {...control}
                      autoComplete="off"
                      maxLength={HOME_LIMITS.suffix}
                      value={stat.suffix}
                      placeholder="+"
                      onChange={(event) =>
                        update((draft) => void (draft.stats[index]!.suffix = event.target.value))
                      }
                      className="md:text-small"
                    />
                  )}
                </FormField>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-muted-ink"
                aria-label={t('remove', { name })}
                onClick={() => update((draft) => void draft.stats.splice(index, 1))}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          );
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="quiet"
          size="sm"
          disabled={full}
          onClick={() => {
            const id = newId('st');
            focusAdded(fieldId(`stats.${values.stats.length}.label`));
            update((draft) => void draft.stats.push({ id, label: { mk: '' }, value: 0, suffix: '' }));
          }}
        >
          <Plus aria-hidden />
          {t('add')}
        </Button>
        {full && <span className="text-[13px] text-muted-ink">{t('full', { max: HOME_LIMITS.stats })}</span>}
      </div>
      {error('stats') && <FieldError>{error('stats')}</FieldError>}
    </FormSection>
  );
}

// ─── Section order and visibility ───

export function LayoutSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.home.layout');
  const tSections = useTranslations('admin.home.sections');
  const tKeys = useTranslations('admin.home.layout.keys');
  const items = values.layout.map((item) => ({ ...item, id: item.key }));

  return (
    <FormSection id="layout" title={tSections('layout')} aside={t('aside')}>
      <p className="text-small text-muted-ink">{t('fixed')}</p>
      <SortableList
        label={t('list')}
        items={items}
        itemName={(item) => tKeys(item.key)}
        onReorder={(next) =>
          update((draft) => void (draft.layout = next.map(({ key, visible }) => ({ key, visible }))))
        }
        className="overflow-hidden rounded-md border border-line"
        renderItem={(item, handle) => {
          const index = values.layout.findIndex((candidate) => candidate.key === item.key);
          return (
            <div className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 border-b border-divider p-2.5 pr-4">
              <span className="flex items-center">{handle}</span>
              <span className="flex min-w-0 flex-col">
                <span className="text-small font-medium">{tKeys(item.key)}</span>
                {item.key === 'meeting' && (
                  <span className="text-[13px] text-muted-ink">
                    {t.rich('meetingNote', {
                      link: (chunks) => (
                        <Link href="/admin/settings#contact" className="font-medium text-brand-dark">
                          {chunks}
                        </Link>
                      ),
                    })}
                  </span>
                )}
              </span>
              <SwitchRow
                id={fieldId(`layout.${index}.visible`)}
                label={<span className="sr-only">{t('show', { section: tKeys(item.key) })}</span>}
                checked={item.visible}
                onChange={(visible) => update((draft) => void (draft.layout[index]!.visible = visible))}
              />
            </div>
          );
        }}
      />
      {error('layout') && <FieldError>{error('layout')}</FieldError>}
    </FormSection>
  );
}
