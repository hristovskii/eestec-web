'use client';

import { LoaderCircle, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { FormSection } from '@/shared/admin-ui/form-section';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import { AddRow } from '@/shared/admin-ui/row-list';
import { SortableList } from '@/shared/admin-ui/sortable-list';
import { useFocusAdded } from '@/shared/admin-ui/use-focus-added';
import { resolveLocalized } from '@/shared/i18n/localized';
import type { FieldErrors } from '@/shared/forms/action-result';
import { FormField } from '@/shared/ui/form/form-field';
import { Notice } from '@/shared/ui/notice';
import { Button } from '@/shared/ui/primitives/button';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { saveTiers } from '../../actions/admin-partners';
import { PARTNERS_LIMITS } from '../../schemas/partners.schema';
import { TIER_SIZES, type Sponsor, type SponsorTier } from '../../types';

const KNOWN = ['required', 'tooLong', 'tooMany', 'tooFew', 'inUse'];
const newId = () => `tier-${crypto.randomUUID().slice(0, 8)}`;

/** Admin › Pages › Sponsors › Tiers: the names, sizes and order of the groups of logos. */
export function TiersTab({
  tiers: initial,
  sponsors,
  canEdit,
}: {
  tiers: SponsorTier[];
  sponsors: Sponsor[];
  canEdit: boolean;
}) {
  const t = useTranslations('admin.partners.tiers');
  const tErrors = useTranslations('admin.partners.errors');
  const [saved, setSaved] = React.useState(initial);
  const [tiers, setTiers] = React.useState(initial);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [pending, startTransition] = React.useTransition();
  const focusAdded = useFocusAdded(tiers.length);
  const dirty = JSON.stringify(tiers) !== JSON.stringify(saved);
  const count = (tierId: string) => sponsors.filter((sponsor) => sponsor.tierId === tierId).length;

  const error = (path: string) => {
    const key = errors[path]?.[0];
    return key ? tErrors(KNOWN.includes(key) ? (key as 'required') : 'unexpected') : undefined;
  };
  const listError = error('_form');
  const fieldId = (index: number) => `tier-name-${index}`;

  const save = () =>
    startTransition(async () => {
      const result = await saveTiers(tiers);
      if (result.ok) {
        setSaved(result.data);
        setTiers(result.data);
        setErrors({});
        toast.success(t('saved'));
      } else if (result.error === 'validation') {
        setErrors(result.fieldErrors);
        const first = tiers.findIndex((_tier, index) => result.fieldErrors[`${index}.name.mk`]);
        if (first >= 0) document.getElementById(fieldId(first))?.focus();
      } else toast.error(tErrors(result.error === 'forbidden' ? 'forbidden' : 'unexpected'));
    });

  return (
    <FormSection id="tiers" title={t('title')} aside={t('aside')}>
      <p className="text-small text-muted-ink">{t('help')}</p>
      {listError && (
        <Notice tone="urgent" role="alert">
          {listError}
        </Notice>
      )}
      <fieldset disabled={!canEdit} className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
        <SortableList
          label={t('list')}
          items={tiers}
          itemName={(tier) => resolveLocalized(tier.name, 'en') || t('new')}
          onReorder={setTiers}
          className="flex flex-col gap-3"
          renderItem={(tier, handle) => {
            const index = tiers.findIndex((candidate) => candidate.id === tier.id);
            const used = count(tier.id);
            return (
              <div className="grid grid-cols-[32px_minmax(0,1fr)_36px] items-start gap-2 rounded-md border border-line p-3">
                <span className="mt-6 flex h-(--control-h) items-start">{handle}</span>
                <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                  <LocalizedField
                    id={fieldId(index)}
                    label={t('name')}
                    required
                    value={tier.name}
                    onChange={(name) =>
                      setTiers((current) =>
                        current.map((row) => (row.id === tier.id ? { ...row, name } : row)),
                      )
                    }
                    error={error(`${index}.name.mk`)}
                    maxLength={PARTNERS_LIMITS.tierName}
                  />
                  <FormField id={`tier-size-${index}`} label={t('size')} help={t('sizeHelp')}>
                    {(control) => (
                      <NativeSelect
                        {...control}
                        value={tier.size}
                        onChange={(event) =>
                          setTiers((current) =>
                            current.map((row) =>
                              row.id === tier.id
                                ? { ...row, size: event.target.value as SponsorTier['size'] }
                                : row,
                            ),
                          )
                        }
                      >
                        {TIER_SIZES.map((size) => (
                          <NativeSelectOption key={size} value={size}>
                            {t(`sizes.${size}`)}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    )}
                  </FormField>
                  <p className="text-[13px] text-muted-ink sm:col-span-2">
                    {used > 0 ? t('inUse', { count: used }) : t('unused')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-6 size-9 text-muted-ink"
                  disabled={used > 0}
                  aria-label={
                    used > 0
                      ? t('removeBlocked', { name: resolveLocalized(tier.name, 'en') })
                      : t('remove', { name: resolveLocalized(tier.name, 'en') || t('new') })
                  }
                  onClick={() => setTiers((current) => current.filter((row) => row.id !== tier.id))}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            );
          }}
        />
        <AddRow
          label={t('add')}
          full={tiers.length >= PARTNERS_LIMITS.tiers}
          fullText={t('full', { max: PARTNERS_LIMITS.tiers })}
          onAdd={() => {
            focusAdded(fieldId(tiers.length));
            setTiers((current) => [...current, { id: newId(), name: { mk: '' }, size: 'small' }]);
          }}
        />
      </fieldset>
      {canEdit && (
        <div className="flex items-center gap-3">
          <Button size="sm" disabled={!dirty || pending} aria-busy={pending || undefined} onClick={save}>
            {pending ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden />
                {t('saving')}
              </>
            ) : (
              t('save')
            )}
          </Button>
          {dirty && !pending && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTiers(saved);
                setErrors({});
              }}
            >
              {t('discard')}
            </Button>
          )}
        </div>
      )}
    </FormSection>
  );
}
