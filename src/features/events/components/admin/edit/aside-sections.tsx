'use client';

import { ChevronDown, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { MediaPicker, MediaThumb } from '@/features/media/admin';
import { FormSection, SwitchRow } from '@/shared/admin-ui/form-section';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import { cn } from '@/shared/lib/cn';
import type { Localized } from '@/shared/types/localized';
import { ChoiceLabel, Radio } from '@/shared/ui/form/choice';
import { FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';
import { Switch } from '@/shared/ui/primitives/switch';

import { EVENT_LIMITS } from '../../../schemas/event.schema';
import { CONTENT_STATUSES, EVENT_SCOPES } from '../../../types';
import { fromLocalInput, numberValue, parseNumber, toLocalInput, useEventForm } from './form-kit';
import { OptionalLabel } from './main-sections';

const inputClass = 'md:text-small';
const selectClass = '[&_select]:md:text-small';

export function PublishingSection() {
  const t = useTranslations('admin.events.edit');
  const { values, update, error, fieldId } = useEventForm();
  return (
    <FormSection id="s-pub" title={t('sections.publishing')}>
      <FormField id={fieldId('status')} label={t('fields.status')} help={t('fields.statusHelp')}>
        {(control) => (
          <NativeSelect
            {...control}
            value={values.status}
            onChange={(event) =>
              update((draft) => void (draft.status = event.target.value as (typeof CONTENT_STATUSES)[number]))
            }
            className={selectClass}
          >
            {CONTENT_STATUSES.map((status) => (
              <NativeSelectOption key={status} value={status}>
                {t(`statuses.${status}`)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </FormField>
      <FormField
        id={fieldId('publishAt')}
        label={<OptionalLabel>{t('fields.publishAt')}</OptionalLabel>}
        help={t('fields.publishAtHelp')}
        error={error('publishAt')}
      >
        {(control) => (
          <Input
            {...control}
            type="datetime-local"
            value={toLocalInput(values.publishAt)}
            onChange={(event) =>
              update((draft) => void (draft.publishAt = fromLocalInput(event.target.value)))
            }
            className={inputClass}
          />
        )}
      </FormField>
      <SwitchRow
        id={fieldId('nextUp')}
        label={t('fields.nextUp')}
        checked={values.nextUp}
        onChange={(nextUp) => update((draft) => void (draft.nextUp = nextUp))}
      />
    </FormSection>
  );
}

export function CategorySection({ types }: { types: { id: string; name: Localized }[] }) {
  const t = useTranslations('admin.events');
  const { values, update, error, fieldId } = useEventForm();
  const labelId = React.useId();
  return (
    <FormSection id="s-cat" title={t('edit.sections.category')}>
      <div className="flex flex-col">
        <span id={labelId} className="mb-1.5 text-small font-medium">
          {t('edit.fields.scope')}
          <span className="text-brand-dark" aria-hidden>
            {' '}
            *
          </span>
        </span>
        <div
          role="group"
          aria-labelledby={labelId}
          className="flex rounded-sm border border-line-strong bg-white p-[3px]"
        >
          {EVENT_SCOPES.map((scope) => (
            <button
              key={scope}
              type="button"
              aria-pressed={values.scope === scope}
              onClick={() => update((draft) => void (draft.scope = scope))}
              className={cn(
                'h-[30px] flex-1 cursor-pointer rounded-sm text-[13px] font-medium',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
                values.scope === scope ? 'bg-ink text-white' : 'text-ink-2 hover:bg-surface',
              )}
            >
              {t(`scopes.${scope}`)}
            </button>
          ))}
        </div>
      </div>
      <FormField id={fieldId('typeId')} label={t('edit.fields.type')} required error={error('typeId')}>
        {(control) => (
          <NativeSelect
            {...control}
            value={values.typeId}
            onChange={(event) => update((draft) => void (draft.typeId = event.target.value))}
            className={selectClass}
          >
            {types.map((type) => (
              <NativeSelectOption key={type.id} value={type.id}>
                {type.name.mk}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </FormField>
    </FormSection>
  );
}

export function ApplicationsSection() {
  const t = useTranslations('admin.events.edit');
  const { values, update, error, fieldId } = useEventForm();
  const apps = values.applications;
  const set = (recipe: (draft: typeof apps) => void) => update((draft) => recipe(draft.applications));
  const viaName = React.useId();

  return (
    <section
      id="s-app"
      aria-labelledby="s-app-title"
      className="scroll-mt-20 overflow-hidden rounded-md border border-line bg-white lg:scroll-mt-40"
    >
      <div className="flex items-center justify-between gap-3 border-b border-divider px-4 py-4 md:px-5">
        <h2 id="s-app-title" className="text-[16px] font-bold">
          {t('sections.applications')}
        </h2>
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="text-[13px] text-muted-ink">
            {t('fields.accept')}
          </span>
          <Switch
            size="sm"
            aria-label={t('fields.acceptLabel')}
            checked={apps.enabled}
            onCheckedChange={(enabled) => set((draft) => void (draft.enabled = enabled))}
          />
        </span>
      </div>
      <div className="flex flex-col gap-4 p-4 md:p-5">
        {!apps.enabled ? (
          <p className="text-small text-muted-ink">{t('fields.applicationsOff')}</p>
        ) : (
          <>
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2 text-small font-medium">{t('fields.applyVia')}</legend>
              {(['form', 'external'] as const).map((via) => (
                <ChoiceLabel
                  key={via}
                  control={
                    <Radio
                      name={viaName}
                      checked={apps.via === via}
                      onChange={() => set((draft) => void (draft.via = via))}
                    />
                  }
                  className="text-small"
                >
                  {via === 'form' ? t('fields.viaForm') : t('fields.viaExternal')}
                </ChoiceLabel>
              ))}
            </fieldset>
            {apps.via === 'external' && (
              <FormField
                id={fieldId('applications.externalUrl')}
                label={t('fields.externalUrl')}
                required
                error={error('applications.externalUrl')}
              >
                {(control) => (
                  <Input
                    {...control}
                    type="url"
                    value={apps.externalUrl}
                    placeholder={t('fields.externalUrlPlaceholder')}
                    onChange={(event) => set((draft) => void (draft.externalUrl = event.target.value.trim()))}
                    className={inputClass}
                  />
                )}
              </FormField>
            )}
            <div className="grid grid-cols-1 gap-2.5">
              <FormField
                id={fieldId('applications.opensAt')}
                label={t('fields.opensAt')}
                error={error('applications.opensAt')}
              >
                {(control) => (
                  <Input
                    {...control}
                    type="datetime-local"
                    value={toLocalInput(apps.opensAt)}
                    onChange={(event) =>
                      set((draft) => void (draft.opensAt = fromLocalInput(event.target.value)))
                    }
                    className={inputClass}
                  />
                )}
              </FormField>
              <FormField
                id={fieldId('applications.deadline')}
                label={t('fields.deadline')}
                required={apps.via === 'form'}
                error={error('applications.deadline')}
              >
                {(control) => (
                  <Input
                    {...control}
                    type="datetime-local"
                    value={toLocalInput(apps.deadline)}
                    onChange={(event) =>
                      set((draft) => void (draft.deadline = fromLocalInput(event.target.value)))
                    }
                    className={inputClass}
                  />
                )}
              </FormField>
            </div>
            {apps.via === 'form' && (
              <>
                <div className="flex flex-wrap gap-2.5">
                  <FormField
                    id={fieldId('applications.maxParticipants')}
                    label={t('fields.maxParticipants')}
                    error={error('applications.maxParticipants')}
                  >
                    {(control) => (
                      <Input
                        {...control}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={numberValue(apps.maxParticipants)}
                        onChange={(event) =>
                          set((draft) => void (draft.maxParticipants = parseNumber(event.target.value)))
                        }
                        className={`${inputClass} w-[120px]`}
                      />
                    )}
                  </FormField>
                  <FormField
                    id={fieldId('applications.resultsOn')}
                    label={<OptionalLabel>{t('fields.resultsOn')}</OptionalLabel>}
                    error={error('applications.resultsOn')}
                    className="min-w-0 flex-1"
                  >
                    {(control) => (
                      <Input
                        {...control}
                        type="date"
                        value={apps.resultsOn ?? ''}
                        onChange={(event) =>
                          set((draft) => void (draft.resultsOn = event.target.value || null))
                        }
                        className={inputClass}
                      />
                    )}
                  </FormField>
                </div>
                <SwitchRow
                  id={fieldId('applications.waitlist')}
                  label={t('fields.waitlist')}
                  checked={apps.waitlist}
                  onChange={(waitlist) => set((draft) => void (draft.waitlist = waitlist))}
                />
                <p className="text-[13px] text-muted-ink">{t('fields.formLater')}</p>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export function SeoSection() {
  const t = useTranslations('admin.events.edit');
  const { values, update, error, media, addMedia, fieldId } = useEventForm();
  const hasError = Object.keys(values.seo).some((key) => error(`seo.${key}.mk`) || error(`seo.${key}`));
  const [open, setOpen] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  // An error inside opens the section, so the summary links have somewhere to go.
  const [lastError, setLastError] = React.useState(hasError);
  if (hasError !== lastError) {
    setLastError(hasError);
    if (hasError) setOpen(true);
  }
  const share = values.seo.shareImageId ? media[values.seo.shareImageId] : undefined;

  return (
    <section aria-labelledby="s-seo-title" className="overflow-hidden rounded-md border border-line bg-white">
      <h2 id="s-seo-title">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="s-seo-body"
          onClick={() => setOpen(!open)}
          className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-4 text-left text-[16px] font-bold focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand md:px-5"
        >
          {t('sections.seo')}
          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
      </h2>
      <div id="s-seo-body" hidden={!open} className="flex flex-col gap-4 border-t border-divider p-4 md:p-5">
        <LocalizedField
          id={fieldId('seo.title')}
          label={t('fields.seoTitle')}
          help={t('fields.seoTitleHelp')}
          maxLength={EVENT_LIMITS.seoTitle}
          placeholder={values.title.mk}
          value={values.seo.title}
          onChange={(title) => update((draft) => void (draft.seo.title = title))}
          error={error('seo.title.mk') ?? error('seo.title.en')}
        />
        <LocalizedField
          id={fieldId('seo.description')}
          label={t('fields.seoDescription')}
          help={t('fields.seoDescriptionHelp')}
          multiline
          rows={3}
          maxLength={EVENT_LIMITS.seoDescription}
          placeholder={values.shortDescription.mk}
          value={values.seo.description}
          onChange={(description) => update((draft) => void (draft.seo.description = description))}
          error={error('seo.description.mk') ?? error('seo.description.en')}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-small font-medium">{t('fields.shareImage')}</span>
          {share ? (
            <span className="relative block aspect-[1.91/1] overflow-hidden rounded-sm border border-line">
              <MediaThumb item={share} sizes="300px" />
              <Button
                size="icon"
                variant="quiet"
                aria-label={t('fields.shareImageRemove')}
                className="absolute top-2 right-2 size-7.5 bg-white/95"
                onClick={() => update((draft) => void (draft.seo.shareImageId = null))}
              >
                <X aria-hidden />
              </Button>
            </span>
          ) : null}
          <Button
            id={fieldId('seo.shareImageId')}
            variant="quiet"
            size="sm"
            className="w-fit"
            onClick={() => setPicking(true)}
          >
            {t('fields.shareImageChoose')}
          </Button>
          <span className="text-small text-muted-ink">{t('fields.shareImageHelp')}</span>
        </div>
      </div>
      <MediaPicker
        open={picking}
        onOpenChange={setPicking}
        currentId={values.seo.shareImageId}
        onPick={(item) => {
          addMedia([item]);
          update((draft) => void (draft.seo.shareImageId = item.id));
        }}
      />
    </section>
  );
}
