'use client';

import { Plus, Quote, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { MediaRefField } from '@/features/media/admin';
import { FormSection } from '@/shared/admin-ui/form-section';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import { SortableList } from '@/shared/admin-ui/sortable-list';
import { useFocusAdded } from '@/shared/admin-ui/use-focus-added';
import { resolveLocalized } from '@/shared/i18n/localized';
import { FieldError, FormField } from '@/shared/ui/form/form-field';
import { Notice } from '@/shared/ui/notice';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { isMemberPath } from '../../domain/phase';
import { JOURNEY_LIMITS } from '../../schemas/journey.schema';
import { JOURNEY_ICONS, type JourneyButton } from '../../types';
import { JourneyIconView } from '../journey-icon';
import { fieldId, newId, type SectionProps } from './form-kit';

const nameOf = (value: { mk: string; en?: string }, fallback: string) =>
  resolveLocalized(value, 'en').trim() || fallback;

// ─── Page texts ───

export function HeroSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.journey.hero');
  const tSections = useTranslations('admin.journey.sections');
  const hero = values.hero;
  return (
    <FormSection id="hero" title={tSections('hero')} aside={t('aside')}>
      <LocalizedField
        id={fieldId('hero.eyebrow')}
        label={t('eyebrow')}
        help={t('eyebrowHelp')}
        value={hero.eyebrow}
        onChange={(value) => update((draft) => void (draft.hero.eyebrow = value))}
        error={error('hero.eyebrow.mk')}
        maxLength={JOURNEY_LIMITS.eyebrow}
      />
      <LocalizedField
        id={fieldId('hero.title')}
        label={t('title')}
        required
        value={hero.title}
        onChange={(value) => update((draft) => void (draft.hero.title = value))}
        error={error('hero.title.mk')}
        maxLength={JOURNEY_LIMITS.title}
      />
      <LocalizedField
        id={fieldId('hero.lead')}
        label={t('lead')}
        required
        multiline
        rows={2}
        value={hero.lead}
        onChange={(value) => update((draft) => void (draft.hero.lead = value))}
        error={error('hero.lead.mk')}
        maxLength={JOURNEY_LIMITS.lead}
      />
    </FormSection>
  );
}

// ─── A button: label and link ───

function ButtonFields({
  path,
  title,
  value,
  onChange,
  error,
}: {
  path: string;
  title: string;
  value: JourneyButton;
  onChange: (value: JourneyButton) => void;
  error: SectionProps['error'];
}) {
  const t = useTranslations('admin.journey.button');
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 rounded-md border border-line p-3.5">
      <legend className="px-1.5 text-small font-bold">{title}</legend>
      <LocalizedField
        id={fieldId(`${path}.label`)}
        label={t('label')}
        required
        value={value.label}
        onChange={(label) => onChange({ ...value, label })}
        error={error(`${path}.label.mk`)}
        maxLength={JOURNEY_LIMITS.button}
      />
      <FormField
        id={fieldId(`${path}.href`)}
        label={t('link')}
        required
        help={t('linkHelp')}
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
      {isMemberPath(value.href.trim()) && <Notice tone="info">{t('memberPage')}</Notice>}
    </fieldset>
  );
}

// ─── Steps ───

export function StepsSection({ values, update, error, media, addMedia }: SectionProps) {
  const t = useTranslations('admin.journey.steps');
  const tSections = useTranslations('admin.journey.sections');
  const focusAdded = useFocusAdded(values.steps);
  const full = values.steps.length >= JOURNEY_LIMITS.steps;

  return (
    <FormSection id="steps" title={tSections('steps')} aside={t('aside')}>
      <SortableList
        label={t('list')}
        items={values.steps}
        itemName={(step) => nameOf(step.title, t('new'))}
        onReorder={(items) => update((draft) => void (draft.steps = items))}
        className="flex flex-col gap-3"
        renderItem={(step, handle) => {
          const index = values.steps.findIndex((candidate) => candidate.id === step.id);
          const path = `steps.${index}`;
          const name = nameOf(step.title, t('new'));
          return (
            <div className="grid grid-cols-[32px_minmax(0,1fr)_36px] items-start gap-2 rounded-md border border-line p-3">
              <span className="flex h-(--control-h) items-center">{handle}</span>
              <div className="flex min-w-0 flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
                  <FormField id={fieldId(`${path}.icon`)} label={t('icon')} error={error(`${path}.icon`)}>
                    {(control) => (
                      <div className="flex items-center gap-2">
                        <span className="flex size-(--control-h) shrink-0 items-center justify-center rounded-md bg-surface">
                          <JourneyIconView icon={step.icon} className="size-5" />
                        </span>
                        <NativeSelect
                          {...control}
                          value={step.icon}
                          onChange={(event) =>
                            update(
                              (draft) =>
                                void (draft.steps[index]!.icon = event.target
                                  .value as (typeof JOURNEY_ICONS)[number]),
                            )
                          }
                          className="min-w-0 flex-1 [&_select]:md:text-small"
                        >
                          {JOURNEY_ICONS.map((icon) => (
                            <NativeSelectOption key={icon} value={icon}>
                              {t(`icons.${icon}`)}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      </div>
                    )}
                  </FormField>
                  <LocalizedField
                    id={fieldId(`${path}.title`)}
                    label={t('title')}
                    required
                    value={step.title}
                    onChange={(value) => update((draft) => void (draft.steps[index]!.title = value))}
                    error={error(`${path}.title.mk`)}
                    maxLength={JOURNEY_LIMITS.stepTitle}
                  />
                </div>
                <LocalizedField
                  id={fieldId(`${path}.text`)}
                  label={t('text')}
                  required
                  multiline
                  rows={2}
                  value={step.text}
                  onChange={(value) => update((draft) => void (draft.steps[index]!.text = value))}
                  error={error(`${path}.text.mk`)}
                  maxLength={JOURNEY_LIMITS.stepText}
                />
                <ButtonFields
                  path={`${path}.button`}
                  title={t('button')}
                  value={step.button}
                  onChange={(value) => update((draft) => void (draft.steps[index]!.button = value))}
                  error={error}
                />

                <BulletsField step={step} index={index} update={update} error={error} />

                <MediaRefField
                  altId={fieldId(`${path}.photo.alt`)}
                  altError={error(`${path}.photo.alt.mk`)}
                  maxAlt={JOURNEY_LIMITS.alt}
                  label={t('photo')}
                  value={step.photo}
                  onChange={(photo) => update((draft) => void (draft.steps[index]!.photo = photo))}
                  media={media}
                  addMedia={addMedia}
                  empty={t('photoEmpty')}
                />

                <QuoteField step={step} index={index} update={update} error={error} />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-muted-ink"
                aria-label={t('remove', { name })}
                onClick={() => update((draft) => void draft.steps.splice(index, 1))}
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
            focusAdded(fieldId(`steps.${values.steps.length}.title`));
            update(
              (draft) =>
                void draft.steps.push({
                  id: newId('step'),
                  icon: 'users',
                  title: { mk: '' },
                  text: { mk: '' },
                  button: { label: { mk: '' }, href: '/join' },
                  bullets: [],
                  photo: null,
                  quote: null,
                }),
            );
          }}
        >
          <Plus aria-hidden />
          {t('add')}
        </Button>
        {full && (
          <span className="text-[13px] text-muted-ink">{t('full', { max: JOURNEY_LIMITS.steps })}</span>
        )}
        <span className="text-[13px] text-muted-ink">{t('homeNote')}</span>
      </div>
      {error('steps') && <FieldError>{error('steps')}</FieldError>}
    </FormSection>
  );
}

type StepFieldProps = {
  step: SectionProps['values']['steps'][number];
  index: number;
  update: SectionProps['update'];
  error: SectionProps['error'];
};

/** What the expanded step lists: one line each, up to four. */
function BulletsField({ step, index, update, error }: StepFieldProps) {
  const t = useTranslations('admin.journey.steps');
  const focusAdded = useFocusAdded(step.bullets.length);
  const path = `steps.${index}.bullets`;
  const name = nameOf(step.title, t('new'));
  return (
    <div className="flex flex-col gap-2">
      <span className="text-small font-medium">{t('bullets')}</span>
      <p className="text-[13px] text-muted-ink">{t('bulletsHelp')}</p>
      {step.bullets.map((bullet, bulletIndex) => (
        <div key={bullet.id} className="grid grid-cols-[minmax(0,1fr)_36px] items-start gap-2">
          <LocalizedField
            id={fieldId(`${path}.${bulletIndex}.text`)}
            label={t('bullet', { number: bulletIndex + 1 })}
            required
            value={bullet.text}
            onChange={(value) =>
              update((draft) => void (draft.steps[index]!.bullets[bulletIndex]!.text = value))
            }
            error={error(`${path}.${bulletIndex}.text.mk`)}
            maxLength={JOURNEY_LIMITS.bullet}
          />
          <Button
            variant="ghost"
            size="icon"
            className="mt-6 size-9 text-muted-ink"
            aria-label={t('removeBullet', { number: bulletIndex + 1, name })}
            onClick={() => update((draft) => void draft.steps[index]!.bullets.splice(bulletIndex, 1))}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      ))}
      <div>
        <Button
          variant="quiet"
          size="sm"
          disabled={step.bullets.length >= JOURNEY_LIMITS.bullets}
          onClick={() => {
            focusAdded(fieldId(`${path}.${step.bullets.length}.text`));
            update((draft) => void draft.steps[index]!.bullets.push({ id: newId('b'), text: { mk: '' } }));
          }}
        >
          <Plus aria-hidden />
          {t('addBullet')}
        </Button>
      </div>
      {error(path) && <FieldError>{error(path)}</FieldError>}
    </div>
  );
}

/** One optional member quote under the step's benefits. */
function QuoteField({ step, index, update, error }: StepFieldProps) {
  const t = useTranslations('admin.journey.steps');
  const path = `steps.${index}.quote`;
  const quote = step.quote;
  return (
    <div className="flex flex-col gap-3">
      <span className="text-small font-medium">{t('quote')}</span>
      {quote ? (
        <>
          <LocalizedField
            id={fieldId(`${path}.text`)}
            label={t('quoteText')}
            required
            multiline
            rows={2}
            value={quote.text}
            onChange={(value) => update((draft) => void (draft.steps[index]!.quote!.text = value))}
            error={error(`${path}.text.mk`)}
            maxLength={JOURNEY_LIMITS.quote}
          />
          <LocalizedField
            id={fieldId(`${path}.author`)}
            label={t('quoteAuthor')}
            required
            help={t('quoteAuthorHelp')}
            value={quote.author}
            onChange={(value) => update((draft) => void (draft.steps[index]!.quote!.author = value))}
            error={error(`${path}.author.mk`)}
            maxLength={JOURNEY_LIMITS.author}
          />
          <div>
            <Button
              variant="quiet"
              size="sm"
              onClick={() => update((draft) => void (draft.steps[index]!.quote = null))}
            >
              <Trash2 aria-hidden />
              {t('removeQuote')}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-small text-muted-ink">{t('quoteEmpty')}</p>
          <Button
            variant="quiet"
            size="sm"
            onClick={() =>
              update((draft) => void (draft.steps[index]!.quote = { text: { mk: '' }, author: { mk: '' } }))
            }
          >
            <Quote aria-hidden />
            {t('addQuote')}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Final call to action ───

export function CtaSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.journey.cta');
  const tSections = useTranslations('admin.journey.sections');
  const cta = values.cta;
  return (
    <FormSection id="cta" title={tSections('cta')} aside={t('aside')}>
      <LocalizedField
        id={fieldId('cta.title')}
        label={t('title')}
        required
        value={cta.title}
        onChange={(value) => update((draft) => void (draft.cta.title = value))}
        error={error('cta.title.mk')}
        maxLength={JOURNEY_LIMITS.title}
      />
      <LocalizedField
        id={fieldId('cta.text')}
        label={t('text')}
        required
        multiline
        rows={2}
        value={cta.text}
        onChange={(value) => update((draft) => void (draft.cta.text = value))}
        error={error('cta.text.mk')}
        maxLength={JOURNEY_LIMITS.ctaText}
      />
      <ButtonFields
        path="cta.button"
        title={t('button')}
        value={cta.button}
        onChange={(value) => update((draft) => void (draft.cta.button = value))}
        error={error}
      />
      <p className="text-[13px] text-muted-ink">{t('meetingNote')}</p>
    </FormSection>
  );
}
