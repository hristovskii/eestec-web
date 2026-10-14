'use client';

import { FileText, Library, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { formatBytes, type MediaItem } from '@/features/media';
import { MediaPicker } from '@/features/media/admin';
import { FormSection, SwitchRow } from '@/shared/admin-ui/form-section';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import { LocalizedListField, type LocalizedListItem } from '@/shared/admin-ui/localized-list-field';
import { SortableList } from '@/shared/admin-ui/sortable-list';
import { useFocusAdded } from '@/shared/admin-ui/use-focus-added';
import { resolveLocalized } from '@/shared/i18n/localized';
import { FieldError, FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { JOIN_LIMITS } from '../../schemas/join.schema';
import { JOIN_ICONS, JOIN_SECTIONS, type JoinCard, type JoinInput } from '../../types';
import { JoinIconView } from '../join-icon';
import { fieldId, newId, type SectionProps } from './form-kit';

const nameOf = (value: { mk: string; en?: string }, fallback: string) =>
  resolveLocalized(value, 'en').trim() || fallback;

// ─── Page texts ───

export function PageSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.join.page');
  const tSections = useTranslations('admin.join.sections');
  const tNav = useTranslations('admin.join.nav');
  return (
    <FormSection id="page" title={tSections('page')} aside={t('aside')}>
      <LocalizedField
        id={fieldId('hero.eyebrow')}
        label={t('eyebrow')}
        help={t('eyebrowHelp')}
        value={values.hero.eyebrow}
        onChange={(value) => update((draft) => void (draft.hero.eyebrow = value))}
        error={error('hero.eyebrow.mk')}
        maxLength={JOIN_LIMITS.eyebrow}
      />
      <LocalizedField
        id={fieldId('hero.title')}
        label={t('title')}
        required
        value={values.hero.title}
        onChange={(value) => update((draft) => void (draft.hero.title = value))}
        error={error('hero.title.mk')}
        maxLength={JOIN_LIMITS.title}
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
        maxLength={JOIN_LIMITS.lead}
      />
      <div className="flex flex-col gap-3.5 rounded-md bg-surface p-3.5">
        <span className="text-small font-bold">{t('headings')}</span>
        <p className="text-[13px] text-muted-ink">{t('headingsHelp')}</p>
        {JOIN_SECTIONS.map((key) => (
          <LocalizedField
            key={key}
            id={fieldId(`headings.${key}`)}
            label={t('headingOf', { section: tNav(key) })}
            required
            value={values.headings[key]}
            onChange={(value) => update((draft) => void (draft.headings[key] = value))}
            error={error(`headings.${key}.mk`)}
            maxLength={JOIN_LIMITS.title}
          />
        ))}
      </div>
    </FormSection>
  );
}

// ─── Cards with an icon (glance, benefits, code of conduct) ───

function IconSelect({
  id,
  value,
  onChange,
  label,
  error,
}: {
  id: string;
  value: JoinCard['icon'];
  onChange: (icon: JoinCard['icon']) => void;
  label: string;
  error?: string;
}) {
  const t = useTranslations('admin.join.icons');
  return (
    <FormField id={id} label={label} error={error}>
      {(control) => (
        <div className="flex items-center gap-2">
          <span className="flex size-(--control-h) shrink-0 items-center justify-center rounded-md bg-surface">
            <JoinIconView icon={value} className="size-5" />
          </span>
          <NativeSelect
            {...control}
            value={value}
            onChange={(event) => onChange(event.target.value as JoinCard['icon'])}
            className="min-w-0 flex-1 [&_select]:md:text-small"
          >
            {JOIN_ICONS.map((icon) => (
              <NativeSelectOption key={icon} value={icon}>
                {t(icon)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      )}
    </FormField>
  );
}

/** A reorderable list of rows; `fields` draws the inside of one row. */
function RowList<T extends { id: string }>({
  label,
  items,
  onReorder,
  itemName,
  fields,
  onRemove,
  removeLabel,
}: {
  label: string;
  items: T[];
  onReorder: (items: T[]) => void;
  itemName: (item: T) => string;
  fields: (item: T, index: number) => React.ReactNode;
  onRemove: (index: number) => void;
  removeLabel: (name: string) => string;
}) {
  return (
    <SortableList
      label={label}
      items={items}
      itemName={itemName}
      onReorder={onReorder}
      className="flex flex-col gap-3"
      renderItem={(item, handle) => {
        const index = items.findIndex((candidate) => candidate.id === item.id);
        return (
          <div className="grid grid-cols-[32px_minmax(0,1fr)_36px] items-start gap-2 rounded-md border border-line p-3">
            <span className="flex h-(--control-h) items-center">{handle}</span>
            <div className="flex min-w-0 flex-col gap-3">{fields(item, index)}</div>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 text-muted-ink"
              aria-label={removeLabel(itemName(item))}
              onClick={() => onRemove(index)}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        );
      }}
    />
  );
}

function AddRow({
  label,
  onAdd,
  full,
  fullText,
  error,
}: {
  label: string;
  onAdd: () => void;
  full: boolean;
  fullText: string;
  error?: string;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="quiet" size="sm" disabled={full} onClick={onAdd}>
          <Plus aria-hidden />
          {label}
        </Button>
        {full && <span className="text-[13px] text-muted-ink">{fullText}</span>}
      </div>
      {error && <FieldError>{error}</FieldError>}
    </>
  );
}

export function GlanceSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.join.glance');
  const tSections = useTranslations('admin.join.sections');
  const tIcon = useTranslations('admin.join.cards');
  const focusAdded = useFocusAdded(values.glance.length);
  return (
    <FormSection id="glance" title={tSections('glance')} aside={t('aside')}>
      <p className="text-small text-muted-ink">{t('auto')}</p>
      <RowList
        label={t('list')}
        items={values.glance}
        onReorder={(items) => update((draft) => void (draft.glance = items))}
        itemName={(item) => nameOf(item.label, t('new'))}
        removeLabel={(name) => t('remove', { name })}
        onRemove={(index) => update((draft) => void draft.glance.splice(index, 1))}
        fields={(item, index) => (
          <>
            <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
              <IconSelect
                id={fieldId(`glance.${index}.icon`)}
                label={tIcon('icon')}
                value={item.icon}
                onChange={(icon) => update((draft) => void (draft.glance[index]!.icon = icon))}
              />
              <LocalizedField
                id={fieldId(`glance.${index}.label`)}
                label={t('label')}
                required
                value={item.label}
                onChange={(value) => update((draft) => void (draft.glance[index]!.label = value))}
                error={error(`glance.${index}.label.mk`)}
                maxLength={JOIN_LIMITS.glanceLabel}
              />
            </div>
            <LocalizedField
              id={fieldId(`glance.${index}.value`)}
              label={t('value')}
              required
              value={item.value}
              onChange={(value) => update((draft) => void (draft.glance[index]!.value = value))}
              error={error(`glance.${index}.value.mk`)}
              maxLength={JOIN_LIMITS.glanceValue}
            />
          </>
        )}
      />
      <AddRow
        label={t('add')}
        full={values.glance.length >= JOIN_LIMITS.glance}
        fullText={t('full', { max: JOIN_LIMITS.glance })}
        error={error('glance')}
        onAdd={() => {
          focusAdded(fieldId(`glance.${values.glance.length}.label`));
          update(
            (draft) =>
              void draft.glance.push({
                id: newId('glance'),
                icon: 'users',
                label: { mk: '' },
                value: { mk: '' },
              }),
          );
        }}
      />
    </FormSection>
  );
}

/** Benefit cards and code-of-conduct cards: an icon, a title and a text. */
function CardsEditor({
  id,
  path,
  select,
  items,
  max,
  title,
  aside,
  strings,
  update,
  error,
}: {
  id: string;
  path: 'benefits' | 'rules.conduct';
  select: (draft: JoinInput) => JoinCard[];
  items: JoinCard[];
  max: number;
  title: string;
  aside: string;
  strings: { list: string; new: string; add: string; remove: (name: string) => string; full: string };
  update: SectionProps['update'];
  error: SectionProps['error'];
}) {
  const t = useTranslations('admin.join.cards');
  const focusAdded = useFocusAdded(items.length);
  return (
    <FormSection id={id} title={title} aside={aside}>
      <RowList
        label={strings.list}
        items={items}
        onReorder={(next) => update((draft) => void select(draft).splice(0, Infinity, ...next))}
        itemName={(item) => nameOf(item.title, strings.new)}
        removeLabel={strings.remove}
        onRemove={(index) => update((draft) => void select(draft).splice(index, 1))}
        fields={(item, index) => (
          <>
            <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
              <IconSelect
                id={fieldId(`${path}.${index}.icon`)}
                label={t('icon')}
                value={item.icon}
                onChange={(icon) => update((draft) => void (select(draft)[index]!.icon = icon))}
              />
              <LocalizedField
                id={fieldId(`${path}.${index}.title`)}
                label={t('title')}
                required
                value={item.title}
                onChange={(value) => update((draft) => void (select(draft)[index]!.title = value))}
                error={error(`${path}.${index}.title.mk`)}
                maxLength={JOIN_LIMITS.cardTitle}
              />
            </div>
            <LocalizedField
              id={fieldId(`${path}.${index}.text`)}
              label={t('text')}
              required
              multiline
              rows={2}
              value={item.text}
              onChange={(value) => update((draft) => void (select(draft)[index]!.text = value))}
              error={error(`${path}.${index}.text.mk`)}
              maxLength={JOIN_LIMITS.cardText}
            />
          </>
        )}
      />
      <AddRow
        label={strings.add}
        full={items.length >= max}
        fullText={strings.full}
        error={error(path)}
        onAdd={() => {
          focusAdded(fieldId(`${path}.${items.length}.title`));
          update(
            (draft) =>
              void select(draft).push({
                id: newId('card'),
                icon: 'users',
                title: { mk: '' },
                text: { mk: '' },
              }),
          );
        }}
      />
    </FormSection>
  );
}

export function BenefitsSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.join.benefits');
  const tSections = useTranslations('admin.join.sections');
  return (
    <CardsEditor
      id="why"
      path="benefits"
      select={(draft) => draft.benefits}
      items={values.benefits}
      max={JOIN_LIMITS.benefits}
      title={tSections('why')}
      aside={t('aside')}
      strings={{
        list: t('list'),
        new: t('new'),
        add: t('add'),
        remove: (name) => t('remove', { name }),
        full: t('full', { max: JOIN_LIMITS.benefits }),
      }}
      update={update}
      error={error}
    />
  );
}

// ─── Who can join ───

export function WhoSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.join.who');
  const tSections = useTranslations('admin.join.sections');
  const e = values.eligibility;
  return (
    <FormSection id="who" title={tSections('who')} aside={t('aside')}>
      <LocalizedListField
        label={t('items')}
        items={e.items}
        onChange={(items) => update((draft) => void (draft.eligibility.items = items))}
        fieldId={(index) => fieldId(`eligibility.items.${index}.text`)}
        error={(index) => error(`eligibility.items.${index}.text.mk`)}
        listError={error('eligibility.items')}
        maxItems={JOIN_LIMITS.lines}
        maxLength={JOIN_LIMITS.line}
        newId={() => newId('elig')}
        text={{
          item: (n) => t('item', { number: n }),
          add: t('add'),
          remove: (n) => t('remove', { number: n }),
          empty: t('empty'),
          full: t('full', { max: JOIN_LIMITS.lines }),
        }}
      />
      <LocalizedField
        id={fieldId('eligibility.noteTitle')}
        label={t('noteTitle')}
        help={t('noteHelp')}
        value={e.noteTitle}
        onChange={(value) => update((draft) => void (draft.eligibility.noteTitle = value))}
        error={error('eligibility.noteTitle.mk')}
        maxLength={JOIN_LIMITS.cardTitle}
      />
      <LocalizedField
        id={fieldId('eligibility.noteText')}
        label={t('noteText')}
        multiline
        rows={2}
        help={t('noteMail')}
        value={e.noteText}
        onChange={(value) => update((draft) => void (draft.eligibility.noteText = value))}
        error={error('eligibility.noteText.mk')}
        maxLength={JOIN_LIMITS.note}
      />
    </FormSection>
  );
}

// ─── How to join ───

export function HowSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.join.how');
  const tSections = useTranslations('admin.join.sections');
  const focusAdded = useFocusAdded(values.steps.length);
  return (
    <FormSection id="how" title={tSections('how')} aside={t('aside')}>
      <RowList
        label={t('list')}
        items={values.steps}
        onReorder={(items) => update((draft) => void (draft.steps = items))}
        itemName={(item) => nameOf(item.title, t('new'))}
        removeLabel={(name) => t('remove', { name })}
        onRemove={(index) => update((draft) => void draft.steps.splice(index, 1))}
        fields={(item, index) => (
          <>
            <LocalizedField
              id={fieldId(`steps.${index}.title`)}
              label={t('title', { number: index + 1 })}
              required
              value={item.title}
              onChange={(value) => update((draft) => void (draft.steps[index]!.title = value))}
              error={error(`steps.${index}.title.mk`)}
              maxLength={JOIN_LIMITS.stepTitle}
            />
            <LocalizedField
              id={fieldId(`steps.${index}.text`)}
              label={t('text')}
              required
              value={item.text}
              onChange={(value) => update((draft) => void (draft.steps[index]!.text = value))}
              error={error(`steps.${index}.text.mk`)}
              maxLength={JOIN_LIMITS.stepText}
            />
          </>
        )}
      />
      <AddRow
        label={t('add')}
        full={values.steps.length >= JOIN_LIMITS.steps}
        fullText={t('full', { max: JOIN_LIMITS.steps })}
        error={error('steps')}
        onAdd={() => {
          focusAdded(fieldId(`steps.${values.steps.length}.title`));
          update(
            (draft) => void draft.steps.push({ id: newId('step'), title: { mk: '' }, text: { mk: '' } }),
          );
        }}
      />
      <div className="flex flex-col gap-3.5 rounded-md bg-surface p-3.5">
        <span className="text-small font-bold">{t('fee')}</span>
        <p className="text-[13px] text-muted-ink">{t('feeHelp')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <LocalizedField
            id={fieldId('fee.amount')}
            label={t('feeAmount')}
            value={values.fee.amount}
            onChange={(value) => update((draft) => void (draft.fee.amount = value))}
            error={error('fee.amount.mk')}
            maxLength={JOIN_LIMITS.feeAmount}
          />
          <LocalizedField
            id={fieldId('fee.per')}
            label={t('feePer')}
            value={values.fee.per}
            onChange={(value) => update((draft) => void (draft.fee.per = value))}
            error={error('fee.per.mk')}
            maxLength={JOIN_LIMITS.feePer}
          />
        </div>
        <LocalizedField
          id={fieldId('fee.note')}
          label={t('feeNote')}
          multiline
          rows={2}
          value={values.fee.note}
          onChange={(value) => update((draft) => void (draft.fee.note = value))}
          error={error('fee.note.mk')}
          maxLength={JOIN_LIMITS.note}
        />
      </div>
    </FormSection>
  );
}

// ─── Rules ───

export function RulesSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.join.rules');
  const tSections = useTranslations('admin.join.sections');
  const rules = values.rules;

  const list = (
    key: 'rights' | 'duties' | 'before' | 'during' | 'after',
    items: LocalizedListItem[],
    label: string,
  ) => {
    const path = key === 'rights' || key === 'duties' ? `rules.${key}` : `rules.international.${key}`;
    const set = (draft: JoinInput, next: LocalizedListItem[]) => {
      if (key === 'rights' || key === 'duties') draft.rules[key] = next;
      else draft.rules.international[key] = next;
    };
    return (
      <LocalizedListField
        label={label}
        items={items}
        onChange={(next) => update((draft) => set(draft, next))}
        fieldId={(index) => fieldId(`${path}.${index}.text`)}
        error={(index) => error(`${path}.${index}.text.mk`)}
        listError={error(path)}
        maxItems={JOIN_LIMITS.lines}
        maxLength={JOIN_LIMITS.line}
        newId={() => newId(key)}
        text={{
          item: (n) => t('item', { number: n, list: label }),
          add: t('add', { list: label }),
          remove: (n) => t('remove', { number: n, list: label }),
          empty: t('empty'),
          full: t('full', { max: JOIN_LIMITS.lines }),
        }}
      />
    );
  };

  return (
    <>
      <FormSection id="rules" title={tSections('rules')} aside={t('aside')}>
        <LocalizedField
          id={fieldId('rules.intro')}
          label={t('intro')}
          multiline
          rows={2}
          value={rules.intro}
          onChange={(value) => update((draft) => void (draft.rules.intro = value))}
          error={error('rules.intro.mk')}
          maxLength={JOIN_LIMITS.intro}
        />
        <div className="grid gap-5 lg:grid-cols-2">
          {list('rights', rules.rights, t('rights'))}
          {list('duties', rules.duties, t('duties'))}
        </div>
        <div className="flex flex-col gap-3.5 rounded-md bg-surface p-3.5">
          <span className="text-small font-bold">{t('international')}</span>
          <p className="text-[13px] text-muted-ink">{t('internationalHelp')}</p>
          {list('before', rules.international.before, t('before'))}
          {list('during', rules.international.during, t('during'))}
          {list('after', rules.international.after, t('after'))}
        </div>
      </FormSection>
      <ConductSection values={values} update={update} error={error} />
    </>
  );
}

function ConductSection(props: Pick<SectionProps, 'values' | 'update' | 'error'>) {
  const t = useTranslations('admin.join.conduct');
  return (
    <CardsEditor
      id="conduct"
      path="rules.conduct"
      select={(draft) => draft.rules.conduct}
      items={props.values.rules.conduct}
      max={JOIN_LIMITS.conduct}
      title={t('title')}
      aside={t('aside')}
      strings={{
        list: t('list'),
        new: t('new'),
        add: t('add'),
        remove: (name) => t('remove', { name }),
        full: t('full', { max: JOIN_LIMITS.conduct }),
      }}
      update={props.update}
      error={props.error}
    />
  );
}

// ─── Documents ───

export function DocumentsSection({ values, update, error, media, addMedia }: SectionProps) {
  const t = useTranslations('admin.join.documents');
  const tSections = useTranslations('admin.join.sections');
  const focusAdded = useFocusAdded(values.documents.length);
  // Which row the picker is choosing a file for: an index, 'new', or none.
  const [picking, setPicking] = React.useState<number | 'new' | null>(null);

  const use = (item: MediaItem) => {
    addMedia(item);
    if (picking === 'new') {
      focusAdded(fieldId(`documents.${values.documents.length}.title`));
      update(
        (draft) =>
          void draft.documents.push({
            id: newId('doc'),
            title: { mk: item.fileName.replace(/\.pdf$/i, '') },
            mediaId: item.id,
          }),
      );
    } else if (typeof picking === 'number') {
      update((draft) => void (draft.documents[picking]!.mediaId = item.id));
    }
  };

  return (
    <FormSection id="documents" title={tSections('documents')} aside={t('aside')}>
      <RowList
        label={t('list')}
        items={values.documents}
        onReorder={(items) => update((draft) => void (draft.documents = items))}
        itemName={(item) => nameOf(item.title, t('new'))}
        removeLabel={(name) => t('remove', { name })}
        onRemove={(index) => update((draft) => void draft.documents.splice(index, 1))}
        fields={(item, index) => {
          const file = media[item.mediaId];
          return (
            <>
              <LocalizedField
                id={fieldId(`documents.${index}.title`)}
                label={t('title')}
                required
                value={item.title}
                onChange={(value) => update((draft) => void (draft.documents[index]!.title = value))}
                error={error(`documents.${index}.title.mk`)}
                maxLength={JOIN_LIMITS.cardTitle}
              />
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex min-w-0 items-center gap-2 text-small">
                  <FileText className="size-4 shrink-0 text-muted-ink" aria-hidden />
                  <span className="truncate">
                    {file ? `${file.fileName} · ${formatBytes(file.size)}` : t('noFile')}
                  </span>
                  {file && !file.src && (
                    <span className="shrink-0 text-[13px] text-muted-ink">· {t('sampleFile')}</span>
                  )}
                </span>
                <Button variant="quiet" size="sm" onClick={() => setPicking(index)}>
                  <Library aria-hidden />
                  {t('replace')}
                </Button>
              </div>
              {error(`documents.${index}.mediaId`) && (
                <FieldError>{error(`documents.${index}.mediaId`)}</FieldError>
              )}
            </>
          );
        }}
      />
      <AddRow
        label={t('add')}
        full={values.documents.length >= JOIN_LIMITS.documents}
        fullText={t('full', { max: JOIN_LIMITS.documents })}
        error={error('documents')}
        onAdd={() => setPicking('new')}
      />
      <MediaPicker
        open={picking !== null}
        onOpenChange={(open) => !open && setPicking(null)}
        onPick={(item) => {
          use(item);
          setPicking(null);
        }}
        kind="document"
        allowSamples
        currentId={typeof picking === 'number' ? values.documents[picking]?.mediaId : null}
      />
    </FormSection>
  );
}

// ─── FAQ ───

export function FaqSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.join.faq');
  const tSections = useTranslations('admin.join.sections');
  const focusAdded = useFocusAdded(values.faq.length);
  return (
    <FormSection id="faq" title={tSections('faq')} aside={t('aside')}>
      <RowList
        label={t('list')}
        items={values.faq}
        onReorder={(items) => update((draft) => void (draft.faq = items))}
        itemName={(item) => nameOf(item.question, t('new'))}
        removeLabel={(name) => t('remove', { name })}
        onRemove={(index) => update((draft) => void draft.faq.splice(index, 1))}
        fields={(item, index) => (
          <>
            <LocalizedField
              id={fieldId(`faq.${index}.question`)}
              label={t('question')}
              required
              value={item.question}
              onChange={(value) => update((draft) => void (draft.faq[index]!.question = value))}
              error={error(`faq.${index}.question.mk`)}
              maxLength={JOIN_LIMITS.question}
            />
            <LocalizedField
              id={fieldId(`faq.${index}.answer`)}
              label={t('answer')}
              required
              multiline
              rows={3}
              value={item.answer}
              onChange={(value) => update((draft) => void (draft.faq[index]!.answer = value))}
              error={error(`faq.${index}.answer.mk`)}
              maxLength={JOIN_LIMITS.answer}
            />
          </>
        )}
      />
      <AddRow
        label={t('add')}
        full={values.faq.length >= JOIN_LIMITS.faq}
        fullText={t('full', { max: JOIN_LIMITS.faq })}
        error={error('faq')}
        onAdd={() => {
          focusAdded(fieldId(`faq.${values.faq.length}.question`));
          update(
            (draft) => void draft.faq.push({ id: newId('faq'), question: { mk: '' }, answer: { mk: '' } }),
          );
        }}
      />
    </FormSection>
  );
}

// ─── Applications ───

export function ApplySection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.join.apply');
  const tSections = useTranslations('admin.join.sections');
  const apply = values.apply;

  const list = (key: 'faculties' | 'interests' | 'heardFrom') => (
    <LocalizedListField
      label={t(`lists.${key}`)}
      items={apply[key]}
      onChange={(items) => update((draft) => void (draft.apply[key] = items))}
      fieldId={(index) => fieldId(`apply.${key}.${index}.text`)}
      error={(index) => error(`apply.${key}.${index}.text.mk`)}
      listError={error(`apply.${key}`)}
      maxItems={JOIN_LIMITS.options}
      maxLength={JOIN_LIMITS.option}
      newId={() => newId(key)}
      text={{
        item: (n) => t('item', { number: n }),
        add: t('add'),
        remove: (n) => t('remove', { number: n, list: t(`lists.${key}`) }),
        empty: t('empty'),
        full: t('full', { max: JOIN_LIMITS.options }),
      }}
    />
  );

  return (
    <FormSection id="apply" title={tSections('apply')} aside={t('aside')}>
      <div className="flex flex-col gap-1.5 rounded-md bg-surface p-3.5">
        <SwitchRow
          id={fieldId('apply.open')}
          label={t('open')}
          checked={apply.open}
          onChange={(open) => update((draft) => void (draft.apply.open = open))}
        />
        <p className="text-[13px] text-muted-ink">{apply.open ? t('openHelp') : t('closedHelp')}</p>
      </div>
      <LocalizedField
        id={fieldId('apply.nextRound')}
        label={t('nextRound')}
        help={t('nextRoundHelp')}
        value={apply.nextRound}
        onChange={(value) => update((draft) => void (draft.apply.nextRound = value))}
        error={error('apply.nextRound.mk')}
        maxLength={JOIN_LIMITS.nextRound}
      />
      <LocalizedField
        id={fieldId('apply.intro')}
        label={t('intro')}
        multiline
        rows={2}
        value={apply.intro}
        onChange={(value) => update((draft) => void (draft.apply.intro = value))}
        error={error('apply.intro.mk')}
        maxLength={JOIN_LIMITS.intro}
      />
      <p className="text-[13px] text-muted-ink">{t('optionsHelp')}</p>
      <div className="grid gap-5 lg:grid-cols-2">
        {list('faculties')}
        {list('interests')}
        {list('heardFrom')}
      </div>
    </FormSection>
  );
}
