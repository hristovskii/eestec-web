'use client';

import { LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import type { MediaItem } from '@/features/media';
import { MediaRefField } from '@/features/media/admin';
import { AdminDialog } from '@/shared/admin-ui/dialogs';
import { SwitchRow } from '@/shared/admin-ui/form-section';
import type { FieldErrors } from '@/shared/forms/action-result';
import { resolveLocalized } from '@/shared/i18n/localized';
import { FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { saveSponsor } from '../../actions/admin-partners';
import { PARTNERS_LIMITS, sponsorSchema } from '../../schemas/partners.schema';
import type { Sponsor, SponsorTier } from '../../types';

type Values = Omit<Sponsor, 'id'>;

const KNOWN = ['required', 'tooLong', 'url', 'date', 'range'];
const ORDER = ['name', 'tierId', 'websiteUrl', 'activeFrom', 'activeTo'] as const;

const toValues = (sponsor: Sponsor): Values => {
  const { id: _id, ...values } = sponsor;
  return values;
};

/** Add or edit a sponsor (Admin › Pages › Sponsors › Sponsors). */
export function SponsorDialog({
  sponsor,
  tiers,
  defaultTierId,
  media,
  addMedia,
  open,
  onOpenChange,
}: {
  /** null: a new sponsor. */
  sponsor: Sponsor | null;
  tiers: SponsorTier[];
  /** The tier a new sponsor starts in (the "Add" button of that tier). */
  defaultTierId: string;
  media: Record<string, MediaItem>;
  addMedia: (item: MediaItem) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('admin.partners.sponsorDialog');
  const tErrors = useTranslations('admin.partners.errors');
  const tDialogs = useTranslations('admin.ui.dialogs');
  const id = React.useId();
  const nameRef = React.useRef<HTMLInputElement>(null);
  const [values, setValues] = React.useState<Values>(
    sponsor
      ? toValues(sponsor)
      : {
          name: '',
          logo: null,
          websiteUrl: '',
          tierId: defaultTierId,
          activeFrom: '',
          activeTo: '',
          isActive: true,
        },
  );
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [pending, startTransition] = React.useTransition();

  const error = (field: string) => {
    const key = errors[field]?.[0];
    return key ? tErrors(KNOWN.includes(key) ? (key as 'required') : 'unexpected') : undefined;
  };
  const edit = (patch: Partial<Values>) => {
    setValues((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const field of Object.keys(patch)) delete next[field];
      return next;
    });
  };
  const close = (next: boolean) => {
    if (!pending) onOpenChange(next);
  };
  const fieldId = (field: string) => `${id}-${field}`;
  const focusFirst = (found: FieldErrors) => {
    const field = ORDER.find((name) => found[name]) ?? (found['logo.alt.mk'] ? 'logo-alt' : 'name');
    document.getElementById(fieldId(field))?.focus();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const checked = sponsorSchema.safeParse(values);
    if (!checked.success) {
      const next: FieldErrors = {};
      for (const issue of checked.error.issues)
        (next[issue.path.map(String).join('.')] ??= []).push(issue.message);
      setErrors(next);
      focusFirst(next);
      return;
    }
    startTransition(async () => {
      const result = await saveSponsor({ id: sponsor?.id, sponsor: checked.data });
      if (result.ok) {
        toast.success(t(sponsor ? 'updated' : 'created'));
        onOpenChange(false);
        return;
      }
      if (result.error === 'validation') {
        setErrors(result.fieldErrors);
        focusFirst(result.fieldErrors);
      } else toast.error(tErrors(result.error === 'forbidden' ? 'forbidden' : 'unexpected'));
    });
  };

  return (
    <AdminDialog
      open={open}
      onOpenChange={close}
      size="lg"
      title={sponsor ? t('editTitle', { name: sponsor.name }) : t('addTitle')}
      description={t('text')}
      initialFocus={nameRef}
      footer={
        <>
          <Button variant="quiet" size="sm" onClick={() => close(false)} disabled={pending}>
            {tDialogs('cancel')}
          </Button>
          <Button type="submit" form={id} size="sm" disabled={pending} aria-busy={pending || undefined}>
            {pending ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden />
                {t('saving')}
              </>
            ) : (
              t('save')
            )}
          </Button>
        </>
      }
    >
      <form id={id} onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <FormField id={fieldId('name')} label={t('name')} required error={error('name')}>
            {(control) => (
              <Input
                {...control}
                ref={nameRef}
                autoComplete="off"
                maxLength={PARTNERS_LIMITS.sponsorName}
                value={values.name}
                placeholder={t('namePlaceholder')}
                onChange={(event) => edit({ name: event.target.value })}
              />
            )}
          </FormField>
          <FormField id={fieldId('tierId')} label={t('tier')} required error={error('tierId')}>
            {(control) => (
              <NativeSelect
                {...control}
                value={values.tierId}
                onChange={(event) => edit({ tierId: event.target.value })}
              >
                {tiers.map((tier) => (
                  <NativeSelectOption key={tier.id} value={tier.id}>
                    {resolveLocalized(tier.name, 'en')}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </FormField>
        </div>
        <MediaRefField
          altId={fieldId('logo-alt')}
          label={t('logo')}
          value={values.logo}
          onChange={(logo) => edit({ logo })}
          media={media}
          addMedia={addMedia}
          altError={error('logo.alt.mk')}
          maxAlt={PARTNERS_LIMITS.alt}
          empty={t('noLogo')}
        />
        <p className="-mt-1.5 text-small text-muted-ink">{t('logoHelp')}</p>
        <FormField
          id={fieldId('websiteUrl')}
          label={t('website')}
          help={t('websiteHelp')}
          error={error('websiteUrl')}
        >
          {(control) => (
            <Input
              {...control}
              type="url"
              inputMode="url"
              autoComplete="off"
              value={values.websiteUrl}
              placeholder="https://"
              onChange={(event) => edit({ websiteUrl: event.target.value.trim() })}
            />
          )}
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            id={fieldId('activeFrom')}
            label={t('activeFrom')}
            help={t('activeFromHelp')}
            error={error('activeFrom')}
          >
            {(control) => (
              <Input
                {...control}
                type="date"
                value={values.activeFrom}
                onChange={(event) => edit({ activeFrom: event.target.value })}
              />
            )}
          </FormField>
          <FormField
            id={fieldId('activeTo')}
            label={t('activeTo')}
            help={t('activeToHelp')}
            error={error('activeTo')}
          >
            {(control) => (
              <Input
                {...control}
                type="date"
                value={values.activeTo}
                onChange={(event) => edit({ activeTo: event.target.value })}
              />
            )}
          </FormField>
        </div>
        <div className="flex flex-col gap-1.5 rounded-md bg-surface p-3.5">
          <SwitchRow
            id={fieldId('isActive')}
            label={t('active')}
            checked={values.isActive}
            onChange={(isActive) => edit({ isActive })}
          />
          <p className="text-[13px] text-muted-ink">{t('activeHelp')}</p>
        </div>
      </form>
    </AdminDialog>
  );
}
