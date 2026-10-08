'use client';

import { LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { AdminDialog } from '@/shared/admin-ui/dialogs';
import { SwitchRow } from '@/shared/admin-ui/form-section';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import type { FieldErrors } from '@/shared/forms/action-result';
import type { Localized } from '@/shared/types/localized';
import { COUNTRY_CODES, countryName } from '@/shared/i18n/country';
import { FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { saveCommittee } from '../../actions/admin-committees';
import { committeeSchema } from '../../schemas/committee.schema';
import { COMMITTEE_STATUSES, type Committee } from '../../types';

type Values = {
  name: string;
  status: Committee['status'];
  city: Localized;
  country: string;
  lat: string;
  lng: string;
  url: string;
  isHome: boolean;
};

const EMPTY: Values = {
  name: '',
  status: 'lc',
  city: { mk: '' },
  country: '',
  lat: '',
  lng: '',
  url: '',
  isHome: false,
};
const KNOWN = ['required', 'tooLong', 'country', 'number', 'range', 'url', 'duplicate'];
const ORDER = ['name', 'status', 'city', 'country', 'lat', 'lng', 'url'] as const;

const toValues = (committee: Committee): Values => ({
  name: committee.name,
  status: committee.status,
  city: committee.city,
  country: committee.country,
  lat: String(committee.lat),
  lng: String(committee.lng),
  url: committee.url,
  isHome: committee.isHome,
});

/** "41,99" and "41.99" both work; anything else is not a number. */
const toNumber = (text: string) =>
  /^-?\d+(?:[.,]\d+)?$/.test(text.trim()) ? Number(text.trim().replace(',', '.')) : undefined;

/** Add or edit a committee (Admin › Map / Committees). */
export function CommitteeDialog({
  committee,
  open,
  onOpenChange,
}: {
  /** null: a new committee. */
  committee: Committee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('admin.committees');
  const tDialogs = useTranslations('admin.ui.dialogs');
  const id = React.useId();
  const nameRef = React.useRef<HTMLInputElement>(null);
  const [values, setValues] = React.useState<Values>(committee ? toValues(committee) : EMPTY);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [pending, startTransition] = React.useTransition();
  const ours = committee?.isHome ?? false;

  const error = (field: string) => {
    const key = errors[field]?.[0];
    return key ? t(`errors.${KNOWN.includes(key) ? (key as 'required') : 'unexpected'}`) : undefined;
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

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const draft = { ...values, lat: toNumber(values.lat), lng: toNumber(values.lng) };
    const checked = committeeSchema.safeParse(draft);
    if (!checked.success) {
      const next: FieldErrors = {};
      for (const issue of checked.error.issues) (next[String(issue.path[0])] ??= []).push(issue.message);
      setErrors(next);
      document.getElementById(fieldId(ORDER.find((field) => next[field]) ?? 'name'))?.focus();
      return;
    }
    startTransition(async () => {
      const result = await saveCommittee({ id: committee?.id, committee: checked.data });
      if (result.ok) {
        toast.success(t(committee ? 'toasts.updated' : 'toasts.created'));
        onOpenChange(false);
        return;
      }
      if (result.error === 'validation') {
        setErrors(result.fieldErrors);
        document.getElementById(fieldId(ORDER.find((field) => result.fieldErrors[field]) ?? 'name'))?.focus();
      } else toast.error(t(result.error === 'forbidden' ? 'toasts.forbidden' : 'toasts.unexpected'));
    });
  };

  const countries = [...COUNTRY_CODES].sort((a, b) =>
    countryName(a, 'en').localeCompare(countryName(b, 'en')),
  );

  return (
    <AdminDialog
      open={open}
      onOpenChange={close}
      size="lg"
      title={committee ? t('dialog.editTitle', { name: committee.name }) : t('dialog.addTitle')}
      description={t('dialog.text')}
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
                {t('dialog.saving')}
              </>
            ) : (
              t('dialog.save')
            )}
          </Button>
        </>
      }
    >
      <form id={id} onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <FormField id={fieldId('name')} label={t('dialog.name')} required error={error('name')}>
            {(control) => (
              <Input
                {...control}
                ref={nameRef}
                autoComplete="off"
                value={values.name}
                placeholder={t('dialog.namePlaceholder')}
                onChange={(event) => edit({ name: event.target.value })}
              />
            )}
          </FormField>
          <FormField id={fieldId('status')} label={t('dialog.type')} required error={error('status')}>
            {(control) => (
              <NativeSelect
                {...control}
                value={values.status}
                onChange={(event) => edit({ status: event.target.value as Committee['status'] })}
              >
                {COMMITTEE_STATUSES.map((status) => (
                  <NativeSelectOption key={status} value={status}>
                    {t(`types.${status}`)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </FormField>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <LocalizedField
            id={fieldId('city')}
            label={t('dialog.city')}
            required
            value={values.city}
            onChange={(city) => edit({ city })}
            error={error('city')}
            maxLength={80}
          />
          <FormField id={fieldId('country')} label={t('dialog.country')} required error={error('country')}>
            {(control) => (
              <NativeSelect
                {...control}
                value={values.country}
                onChange={(event) => edit({ country: event.target.value })}
              >
                <NativeSelectOption value="">{t('dialog.countryChoose')}</NativeSelectOption>
                {countries.map((code) => (
                  <NativeSelectOption key={code} value={code}>
                    {countryName(code, 'en')}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </FormField>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id={fieldId('lat')} label={t('dialog.lat')} required error={error('lat')}>
            {(control) => (
              <Input
                {...control}
                inputMode="decimal"
                autoComplete="off"
                value={values.lat}
                placeholder="41.9981"
                onChange={(event) => edit({ lat: event.target.value })}
              />
            )}
          </FormField>
          <FormField id={fieldId('lng')} label={t('dialog.lng')} required error={error('lng')}>
            {(control) => (
              <Input
                {...control}
                inputMode="decimal"
                autoComplete="off"
                value={values.lng}
                placeholder="21.4254"
                onChange={(event) => edit({ lng: event.target.value })}
              />
            )}
          </FormField>
        </div>
        <p className="-mt-1.5 text-small text-muted-ink">{t('dialog.coordinatesHelp')}</p>
        <FormField
          id={fieldId('url')}
          label={t('dialog.link')}
          help={t('dialog.linkHelp')}
          error={error('url')}
        >
          {(control) => (
            <Input
              {...control}
              type="url"
              inputMode="url"
              autoComplete="off"
              value={values.url}
              placeholder="https://"
              onChange={(event) => edit({ url: event.target.value.trim() })}
            />
          )}
        </FormField>
        <div className="flex flex-col gap-1.5 rounded-md bg-surface p-3.5">
          <SwitchRow
            id={fieldId('isHome')}
            label={t('dialog.ours')}
            checked={values.isHome}
            disabled={ours}
            onChange={(isHome) => edit({ isHome })}
          />
          <p className="text-[13px] text-muted-ink">{ours ? t('dialog.oursLocked') : t('dialog.oursHelp')}</p>
        </div>
      </form>
    </AdminDialog>
  );
}
