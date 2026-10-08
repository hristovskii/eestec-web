'use client';

import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Lock, Plus, Trash2 } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { AdminBadge, AdminPage } from '@/shared/admin-ui/admin-page';
import { AdminDialog, UnsavedChangesDialog } from '@/shared/admin-ui/dialogs';
import { EditFormLayout, FormSection, SwitchRow } from '@/shared/admin-ui/form-section';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import { SaveBar } from '@/shared/admin-ui/save-bar';
import { SortableList } from '@/shared/admin-ui/sortable-list';
import type { FieldErrors } from '@/shared/forms/action-result';
import { useUnsavedChanges } from '@/shared/forms/use-unsaved-changes';
import { AdminPageCrumb } from '@/shared/layout/admin/admin-shell';
import { cn } from '@/shared/lib/cn';
import type { Localized } from '@/shared/types/localized';
import { ErrorSummary } from '@/shared/ui/form/error-summary';
import { FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { resetApplicationForm, saveApplicationForm } from '../../actions/admin/application-form';
import { newField, newOption } from '../../domain/form-definition';
import { FORM_LIMITS } from '../../schemas/application-form.schema';
import {
  APPLICATION_FIELD_TYPES,
  type ApplicationField,
  type ApplicationFieldType,
  type ApplicationForm,
} from '../../types';

type Form = { intro: Localized; fields: ApplicationField[] };

type FormBuilderProps = {
  event: { id: string; slug: string; title: string };
  form: ApplicationForm;
  /** Still the default questions (nothing saved for this event). */
  isDefault: boolean;
  /** Per question: how many applications answered it. */
  answerCounts: Record<string, number>;
  applicationCount: number;
  canEdit: boolean;
  canEditEvent: boolean;
};

const KNOWN_ERRORS = ['required', 'tooLong', 'tooMany', 'twoOptions', 'duplicate', 'number', 'key'] as const;
const inputClass = 'md:text-small';

const toForm = ({ intro, fields }: ApplicationForm): Form => ({ intro, fields });

/** The admin UI is English: show the English label when there is one, else the required Macedonian one. */
const labelOf = (field: ApplicationField) => field.label.en?.trim() || field.label.mk;

/** /admin/applications/[eventId]/form: the questions of one event's application form. */
export function FormBuilder({
  event,
  form,
  isDefault: initiallyDefault,
  answerCounts,
  applicationCount,
  canEdit,
  canEditEvent,
}: FormBuilderProps) {
  const t = useTranslations('admin.applications.builder');
  const [saved, setSaved] = React.useState(() => toForm(form));
  const [values, setValues] = React.useState(() => toForm(form));
  const [custom, setCustom] = React.useState(!initiallyDefault);
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [removing, setRemoving] = React.useState<ApplicationField | null>(null);
  const [resetting, setResetting] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const summaryRef = React.useRef<HTMLDivElement>(null);

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const guard = useUnsavedChanges(dirty);
  const savedKeys = new Set(saved.fields.map((field) => field.key));
  // Ids carry the event: Next keeps the previous page mounted (hidden) for back / forward.
  const idOf = (path: string) => `fb-${event.id}-${path.replace(/\.(mk|en)$/, '').replaceAll('.', '-')}`;

  const update = (recipe: (draft: Form) => void) =>
    setValues((current) => {
      const draft = structuredClone(current);
      recipe(draft);
      return draft;
    });
  const updateField = (key: string, recipe: (draft: ApplicationField) => void) =>
    update((draft) => {
      const field = draft.fields.find((candidate) => candidate.key === key);
      if (field) recipe(field);
    });

  const message = (path: string) => {
    const key = errors[path]?.[0];
    if (!key) return undefined;
    return t(
      `errors.${(KNOWN_ERRORS as readonly string[]).includes(key) ? (key as 'required') : 'unexpected'}`,
    );
  };

  const labelFor = (path: string) => {
    const [head, index, part, at] = path.split('.');
    if (head === 'intro') return t('labels.intro');
    if (head === 'fields' && index !== undefined) {
      const number = Number(index) + 1;
      return part === 'options' && at !== undefined
        ? t('labels.option', { number, option: Number(at) + 1 })
        : t('labels.question', { number });
    }
    return t('labels.fields');
  };

  const summary = Object.keys(errors)
    .map((path) => ({ path, fieldId: idOf(path), label: labelFor(path), message: message(path)! }))
    .filter((item, index, all) => all.findIndex((other) => other.fieldId === item.fieldId) === index)
    .map(({ fieldId, label, message: text }) => ({ fieldId, label, message: text }));

  const toggle = (key: string, force?: boolean) =>
    setOpen((current) => {
      const next = new Set(current);
      if (force ?? !next.has(key)) next.add(key);
      else next.delete(key);
      return next;
    });

  const add = (type: ApplicationFieldType) => {
    const field = newField(type);
    update((draft) => void draft.fields.push(field));
    toggle(field.key, true);
    requestAnimationFrame(() =>
      document.getElementById(idOf(`fields.${values.fields.length}.label`))?.focus(),
    );
  };

  const remove = (field: ApplicationField) => {
    update((draft) => void (draft.fields = draft.fields.filter((candidate) => candidate.key !== field.key)));
    setErrors({});
  };

  const save = () =>
    new Promise<boolean>((resolve) =>
      startTransition(async () => {
        const result = await saveApplicationForm({ eventId: event.id, form: values });
        if (!result.ok) {
          if (result.error === 'validation') {
            setErrors(result.fieldErrors);
            // Open the questions with a problem so the error summary can focus them.
            setOpen((current) => {
              const next = new Set(current);
              for (const path of Object.keys(result.fieldErrors)) {
                const index = /^fields\.(\d+)\./.exec(path)?.[1];
                const key = index === undefined ? undefined : values.fields[Number(index)]?.key;
                if (key) next.add(key);
              }
              return next;
            });
            requestAnimationFrame(() => summaryRef.current?.focus());
          } else {
            toast.error(t(result.error === 'forbidden' ? 'toasts.forbidden' : 'toasts.unexpected'));
          }
          resolve(false);
          return;
        }
        const next = toForm(result.data);
        setSaved(next);
        setValues(next);
        setCustom(true);
        setErrors({});
        toast.success(t('toasts.saved'));
        resolve(true);
      }),
    );

  const reset = () =>
    startTransition(async () => {
      const result = await resetApplicationForm({ eventId: event.id });
      setResetting(false);
      if (!result.ok) {
        toast.error(t(result.error === 'forbidden' ? 'toasts.forbidden' : 'toasts.unexpected'));
        return;
      }
      // The page reloads with the default questions (the route's key changes, so it starts fresh).
      toast.success(t('toasts.reset'));
    });

  const defaultNow = !custom;
  const items = values.fields.map((field) => ({ id: field.key, field }));
  const atLimit = values.fields.length >= FORM_LIMITS.fields;

  return (
    <AdminPage>
      <AdminPageCrumb label={t('title')} />
      <SaveBar
        headingLevel={1}
        title={t('title')}
        status={{
          label: defaultNow ? t('status.default') : t('status.custom'),
          tone: defaultNow ? 'outline' : 'dark',
        }}
        state={pending ? 'saving' : dirty ? 'dirty' : 'clean'}
        published
        back={{ href: `/admin/applications?event=${event.id}`, label: t('back') }}
        subtitle={t('subtitle', { event: event.title })}
        onSaveDraft={() => undefined}
        onPublish={() => void save()}
        onDiscard={() => {
          setValues(saved);
          setErrors({});
        }}
      />

      {summary.length > 0 && (
        <ErrorSummary ref={summaryRef} title={t('summary', { count: summary.length })} errors={summary} />
      )}

      <EditFormLayout
        main={
          <>
            <FormSection id="fb-intro" title={t('intro.title')}>
              <LocalizedField
                id={idOf('intro')}
                label={t('intro.label')}
                help={t('intro.help')}
                value={values.intro}
                onChange={(intro) => update((draft) => void (draft.intro = intro))}
                error={message('intro.mk')}
                maxLength={FORM_LIMITS.intro}
              />
            </FormSection>

            <FormSection id="fb-fixed" title={t('fixed.title')} aside={t('fixed.text')}>
              <ul className="flex flex-col divide-y divide-divider text-small">
                {(['name', 'email', 'consent'] as const).map((item) => (
                  <li key={item} className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
                    <Lock className="size-4 shrink-0 text-muted-ink" aria-hidden />
                    {t(`fixed.${item}`)}
                  </li>
                ))}
              </ul>
            </FormSection>

            <FormSection
              id="fb-questions"
              title={t('questions.title')}
              aside={t('questions.count', { count: values.fields.length, max: FORM_LIMITS.fields })}
              flush
            >
              {message('fields') && (
                <p
                  role="alert"
                  id={idOf('fields')}
                  tabIndex={-1}
                  className="px-4 pt-4 text-small font-medium text-brand-dark md:px-5"
                >
                  {message('fields')}
                </p>
              )}
              {values.fields.length === 0 ? (
                <p className="px-4 py-6 text-small text-muted-ink md:px-5">{t('questions.empty')}</p>
              ) : (
                <SortableList
                  items={items}
                  label={t('questions.label')}
                  itemName={({ field }) => labelOf(field) || t('questions.newQuestion')}
                  onReorder={(next) =>
                    update((draft) => {
                      const byKey = new Map(draft.fields.map((field) => [field.key, field]));
                      draft.fields = next.map((item) => byKey.get(item.id)!);
                    })
                  }
                  className="divide-y divide-divider"
                  renderItem={({ field }, handle) => {
                    const index = values.fields.findIndex((candidate) => candidate.key === field.key);
                    return (
                      <QuestionCard
                        field={field}
                        index={index}
                        handle={handle}
                        open={open.has(field.key)}
                        onToggle={() => toggle(field.key)}
                        onChange={(recipe) => updateField(field.key, recipe)}
                        onRemove={() =>
                          savedKeys.has(field.key) && (answerCounts[field.key] ?? 0) > 0
                            ? setRemoving(field)
                            : remove(field)
                        }
                        answers={answerCounts[field.key] ?? 0}
                        typeLocked={savedKeys.has(field.key) && applicationCount > 0}
                        idOf={(path) => idOf(`fields.${index}.${path}`)}
                        error={(path) => message(`fields.${index}.${path}`)}
                        readOnly={!canEdit}
                      />
                    );
                  }}
                />
              )}
              {canEdit && (
                <div className="border-t border-divider p-4 md:px-5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="quiet"
                        size="sm"
                        disabled={atLimit}
                        aria-label={t('questions.addLabel')}
                      >
                        <Plus aria-hidden />
                        {t('questions.add')}
                        <ChevronDown className="size-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {APPLICATION_FIELD_TYPES.map((type) => (
                        <DropdownMenuItem key={type} onSelect={() => add(type)}>
                          {t(`questions.types.${type}`)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </FormSection>
          </>
        }
        aside={
          <FormSection id="fb-notes" title={t('aside.title')}>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-small text-ink-2">
              <li>{t('aside.live')}</li>
              <li>{t('aside.sent', { count: applicationCount })}</li>
            </ul>
            <div className="flex flex-col items-start gap-2.5">
              <Button asChild variant="quiet" size="sm">
                <a href={`/en/upcoming/${event.slug}`} target="_blank" rel="noopener noreferrer">
                  {t('aside.viewEvent')}
                </a>
              </Button>
              {canEditEvent && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/events/${event.id}` as Route}>{t('aside.editEvent')}</Link>
                </Button>
              )}
              {canEdit && custom && (
                <Button variant="ghost" size="sm" onClick={() => setResetting(true)} disabled={pending}>
                  {t('aside.reset')}
                </Button>
              )}
            </div>
          </FormSection>
        }
      />

      <AdminDialog
        open={removing !== null}
        onOpenChange={(next) => !next && setRemoving(null)}
        role="alertdialog"
        icon="danger"
        title={t('remove.title', { name: (removing && labelOf(removing)) || t('questions.newQuestion') })}
        description={t('remove.text', { count: removing ? (answerCounts[removing.key] ?? 0) : 0 })}
        footer={
          <>
            <Button variant="quiet" size="sm" onClick={() => setRemoving(null)}>
              {t('remove.cancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (removing) remove(removing);
                setRemoving(null);
              }}
            >
              {t('remove.confirm')}
            </Button>
          </>
        }
      />
      <AdminDialog
        open={resetting}
        onOpenChange={setResetting}
        title={t('reset.title')}
        description={t('reset.text')}
        footer={
          <>
            <Button variant="quiet" size="sm" onClick={() => setResetting(false)}>
              {t('remove.cancel')}
            </Button>
            <Button size="sm" onClick={reset} disabled={pending}>
              {t('reset.confirm')}
            </Button>
          </>
        }
      />
      <UnsavedChangesDialog
        open={guard.open}
        itemTitle={t('title')}
        onStay={guard.stay}
        onDiscard={() => {
          setValues(saved);
          guard.leave();
        }}
        onSaveAndLeave={async () => {
          if (await save()) guard.leave();
          else guard.stay();
        }}
      />
    </AdminPage>
  );
}

type QuestionCardProps = {
  field: ApplicationField;
  index: number;
  handle: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  onChange: (recipe: (draft: ApplicationField) => void) => void;
  onRemove: () => void;
  answers: number;
  typeLocked: boolean;
  idOf: (path: string) => string;
  error: (path: string) => string | undefined;
  readOnly: boolean;
};

/** One question: a summary row, and the settings of its type when open. */
function QuestionCard({
  field,
  index,
  handle,
  open,
  onToggle,
  onChange,
  onRemove,
  answers,
  typeLocked,
  idOf,
  error,
  readOnly,
}: QuestionCardProps) {
  const t = useTranslations('admin.applications.builder');
  const tCard = useTranslations('admin.applications.builder.card');
  const name = labelOf(field) || t('questions.newQuestion');
  const panelId = idOf('panel');
  const hasError = ['label', 'options', 'maxLength'].some((path) => error(path));

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-3 md:px-4">
        {!readOnly && handle}
        <span className="w-6 shrink-0 text-center text-small text-muted-ink tabular-nums">{index + 1}</span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={t(open ? 'questions.collapse' : 'questions.edit', { number: index + 1, name })}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-brand"
        >
          <span
            className={cn('min-w-0 truncate text-small font-medium', !labelOf(field) && 'text-muted-ink')}
          >
            {name}
          </span>
          <AdminBadge tone="neutral" dot={false}>
            {t(`questions.types.${field.type}`)}
          </AdminBadge>
          {field.required && (
            <AdminBadge tone="outline" dot={false}>
              {t('questions.required')}
            </AdminBadge>
          )}
          {hasError && (
            <AdminBadge tone="attention" dot={false}>
              !
            </AdminBadge>
          )}
          {answers > 0 && (
            <span className="shrink-0 text-[13px] text-muted-ink max-sm:hidden">
              {t('questions.answers', { count: answers })}
            </span>
          )}
          {open ? (
            <ChevronUp className="ml-auto size-4 shrink-0 text-muted-ink" aria-hidden />
          ) : (
            <ChevronDown className="ml-auto size-4 shrink-0 text-muted-ink" aria-hidden />
          )}
        </button>
        {!readOnly && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onRemove}
            aria-label={t('questions.remove', { number: index + 1, name })}
          >
            <Trash2 aria-hidden />
          </Button>
        )}
      </div>
      {open && (
        <div
          id={panelId}
          className="flex flex-col gap-4 border-t border-divider bg-surface/40 px-4 py-4 md:px-5"
        >
          <fieldset disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
            <LocalizedField
              id={idOf('label')}
              label={t('card.label')}
              required
              value={field.label}
              onChange={(label) => onChange((draft) => void (draft.label = label))}
              error={error('label.mk')}
              maxLength={FORM_LIMITS.label}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id={idOf('type')}
                label={t('card.type')}
                help={typeLocked ? t('card.typeLocked') : undefined}
              >
                {(control) => (
                  <NativeSelect
                    {...control}
                    value={field.type}
                    disabled={typeLocked}
                    onChange={(event) => {
                      const type = event.target.value as ApplicationFieldType;
                      onChange((draft) => {
                        const fresh = newField(type);
                        draft.type = type;
                        draft.format = fresh.format;
                        draft.maxLength = fresh.maxLength;
                        draft.appearance = fresh.appearance;
                        draft.options = draft.options?.length ? draft.options : fresh.options;
                      });
                    }}
                    className={inputClass}
                  >
                    {APPLICATION_FIELD_TYPES.map((type) => (
                      <NativeSelectOption key={type} value={type}>
                        {t(`questions.types.${type}`)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              <div className="flex items-end pb-1.5">
                <SwitchRow
                  id={idOf('required')}
                  className="w-full"
                  label={field.type === 'checkbox' ? t('card.requiredCheckbox') : t('card.required')}
                  checked={field.required}
                  onChange={(required) => onChange((draft) => void (draft.required = required))}
                />
              </div>
            </div>

            {field.type === 'text' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id={idOf('format')} label={t('card.format')}>
                  {(control) => (
                    <NativeSelect
                      {...control}
                      value={field.format ?? 'plain'}
                      onChange={(event) =>
                        onChange((draft) => void (draft.format = event.target.value as 'plain' | 'phone'))
                      }
                      className={inputClass}
                    >
                      {(['plain', 'phone'] as const).map((format) => (
                        <NativeSelectOption key={format} value={format}>
                          {t(`card.formats.${format}`)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  )}
                </FormField>
                <MaxLength
                  field={field}
                  id={idOf('maxLength')}
                  error={error('maxLength')}
                  onChange={onChange}
                />
              </div>
            )}
            {field.type === 'long_text' && (
              <div className="max-w-[240px]">
                <MaxLength
                  field={field}
                  id={idOf('maxLength')}
                  error={error('maxLength')}
                  onChange={onChange}
                />
              </div>
            )}
            {(field.type === 'text' || field.type === 'long_text') && (
              <LocalizedField
                id={idOf('placeholder')}
                label={t('card.placeholder')}
                value={field.placeholder}
                onChange={(placeholder) => onChange((draft) => void (draft.placeholder = placeholder))}
                maxLength={FORM_LIMITS.placeholder}
              />
            )}
            {field.type === 'select' && (
              <Options field={field} idOf={idOf} error={error} onChange={onChange} />
            )}
            {field.type === 'select' && !field.required && field.appearance !== 'buttons' && (
              <p className="text-[13px] text-muted-ink">{tCard('firstSelected')}</p>
            )}
            {field.type === 'file' && <p className="text-small text-muted-ink">{t('card.fileHelp')}</p>}
            {field.type === 'checkbox' && (
              <p className="text-small text-muted-ink">{t('card.checkboxHelp')}</p>
            )}

            <LocalizedField
              id={idOf('help')}
              label={t('card.help')}
              value={field.help}
              onChange={(help) => onChange((draft) => void (draft.help = help))}
              maxLength={FORM_LIMITS.help}
            />
          </fieldset>
        </div>
      )}
    </div>
  );
}

function MaxLength({
  field,
  id,
  error,
  onChange,
}: {
  field: ApplicationField;
  id: string;
  error?: string;
  onChange: QuestionCardProps['onChange'];
}) {
  const t = useTranslations('admin.applications.builder.card');
  return (
    <FormField id={id} label={t('maxLength')} error={error}>
      {(control) => (
        <Input
          {...control}
          type="number"
          inputMode="numeric"
          min={1}
          max={FORM_LIMITS.textMax}
          value={field.maxLength ?? ''}
          onChange={(event) =>
            onChange((draft) => {
              const value = Number.parseInt(event.target.value, 10);
              draft.maxLength = Number.isFinite(value) ? value : undefined;
            })
          }
          className={inputClass}
        />
      )}
    </FormField>
  );
}

/** The choices of a select question: two inputs per option, and arrows to reorder. */
function Options({
  field,
  idOf,
  error,
  onChange,
}: {
  field: ApplicationField;
  idOf: (path: string) => string;
  error: (path: string) => string | undefined;
  onChange: QuestionCardProps['onChange'];
}) {
  const t = useTranslations('admin.applications.builder.card');
  const options = field.options ?? [];
  const move = (from: number, to: number) =>
    onChange((draft) => {
      const list = draft.options ?? [];
      const [item] = list.splice(from, 1);
      if (item) list.splice(to, 0, item);
    });

  return (
    <fieldset id={idOf('options')} tabIndex={-1} className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend className="mb-1 p-0 text-small font-medium">{t('options')}</legend>
      <FormField id={idOf('appearance')} label={t('appearance')} className="max-w-[240px]">
        {(control) => (
          <NativeSelect
            {...control}
            value={field.appearance ?? 'dropdown'}
            onChange={(event) =>
              onChange((draft) => void (draft.appearance = event.target.value as 'dropdown' | 'buttons'))
            }
            className={inputClass}
          >
            {(['dropdown', 'buttons'] as const).map((appearance) => (
              <NativeSelectOption key={appearance} value={appearance}>
                {t(`appearances.${appearance}`)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </FormField>
      {error('options') && (
        <p role="alert" className="text-small font-medium text-brand-dark">
          {error('options')}
        </p>
      )}
      <ul className="flex flex-col gap-2.5">
        {options.map((option, at) => (
          <li
            key={option.value}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <FormField
              id={idOf(`options.${at}.label`)}
              label={t('optionMk', { number: at + 1 })}
              required
              error={error(`options.${at}.label.mk`)}
              className="col-span-2 sm:col-span-1"
            >
              {(control) => (
                <Input
                  {...control}
                  value={option.label.mk}
                  maxLength={FORM_LIMITS.optionLabel}
                  onChange={(event) =>
                    onChange((draft) => {
                      const target = draft.options?.[at];
                      if (target) target.label.mk = event.target.value;
                    })
                  }
                  className={inputClass}
                />
              )}
            </FormField>
            <FormField id={idOf(`options.${at}.en`)} label={t('optionEn', { number: at + 1 })}>
              {(control) => (
                <Input
                  {...control}
                  value={option.label.en ?? ''}
                  maxLength={FORM_LIMITS.optionLabel}
                  onChange={(event) =>
                    onChange((draft) => {
                      const target = draft.options?.[at];
                      if (target) target.label.en = event.target.value;
                    })
                  }
                  className={inputClass}
                />
              )}
            </FormField>
            <span className="flex gap-0.5 pb-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={at === 0}
                onClick={() => move(at, at - 1)}
                aria-label={t('moveUp', { number: at + 1 })}
              >
                <ArrowUp aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={at === options.length - 1}
                onClick={() => move(at, at + 1)}
                aria-label={t('moveDown', { number: at + 1 })}
              >
                <ArrowDown aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={options.length <= 2}
                onClick={() =>
                  onChange(
                    (draft) => void (draft.options = draft.options?.filter((_, index) => index !== at)),
                  )
                }
                aria-label={t('removeOption', { number: at + 1 })}
              >
                <Trash2 aria-hidden />
              </Button>
            </span>
          </li>
        ))}
      </ul>
      <Button
        variant="quiet"
        size="sm"
        className="self-start"
        disabled={options.length >= FORM_LIMITS.options}
        onClick={() => onChange((draft) => void (draft.options = [...(draft.options ?? []), newOption()]))}
      >
        <Plus aria-hidden />
        {t('addOption')}
      </Button>
    </fieldset>
  );
}
