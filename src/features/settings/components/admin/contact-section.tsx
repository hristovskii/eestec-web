'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { LocalizedField } from '@/shared/admin-ui/localized-field';
import { SortableList } from '@/shared/admin-ui/sortable-list';
import { FieldError, FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';
import { Switch } from '@/shared/ui/primitives/switch';
import { SocialIcon } from '@/shared/ui/social-icon';

import { type LegalInfo, WEEKDAYS } from '../../types';
import { fieldId, type SectionProps, SettingsPanel } from './form-kit';

const PLATFORM_NAMES = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn' } as const;

const LEGAL_FIELDS: { key: keyof LegalInfo; wide?: boolean; placeholder?: string }[] = [
  { key: 'fullName', wide: true },
  { key: 'shortName' },
  { key: 'registeredSeat' },
  { key: 'registrationNumber', placeholder: '0000000' },
  { key: 'taxNumber', placeholder: 'MK0000000000000' },
  { key: 'bankAccount', placeholder: '000-0000000000-00' },
  { key: 'bankName' },
];

const LEGAL_LABELS = {
  fullName: 'legalName',
  shortName: 'shortName',
  registeredSeat: 'registeredSeat',
  registrationNumber: 'registrationNumber',
  taxNumber: 'taxNumber',
  bankAccount: 'bankAccount',
  bankName: 'bankName',
} as const;

export function ContactSection({ values, update, error }: SectionProps) {
  const t = useTranslations('admin.settings.contact');
  const tSections = useTranslations('admin.settings.sections');
  const tDays = useTranslations('admin.weekdays');
  const focusRole = React.useRef<string | null>(null);
  const roleRefs = React.useRef(new Map<string, HTMLInputElement>());

  // A new role: move focus into its title field once it is rendered.
  React.useEffect(() => {
    if (!focusRole.current) return;
    roleRefs.current.get(focusRole.current)?.focus();
    focusRole.current = null;
  }, [values.boardRoles]);

  const meeting = values.weeklyMeeting;

  return (
    <SettingsPanel id="contact" title={tSections('contact')} aside={t('hint')}>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          id={fieldId('contact.mainEmail')}
          label={t('mainEmail')}
          required
          error={error('contact.mainEmail')}
        >
          {(control) => (
            <Input
              {...control}
              type="email"
              value={values.contact.mainEmail}
              onChange={(event) => update((draft) => void (draft.contact.mainEmail = event.target.value))}
              className="md:text-small"
            />
          )}
        </FormField>
        <LocalizedField
          id={fieldId('contact.address')}
          label={t('address')}
          required
          value={values.contact.address}
          onChange={(value) => update((draft) => void (draft.contact.address = value))}
          error={error('contact.address.mk')}
        />
        <LocalizedField
          id={fieldId('contact.officeRoom')}
          label={t('officeRoom')}
          value={values.contact.officeRoom}
          onChange={(value) => update((draft) => void (draft.contact.officeRoom = value))}
          error={error('contact.officeRoom.mk')}
        />
        <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
          <legend className="mb-1.5 p-0 text-small font-medium">{t('meeting')}</legend>
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              aria-label={t('meetingDay')}
              value={meeting.day}
              onChange={(event) =>
                update(
                  (draft) => void (draft.weeklyMeeting.day = event.target.value as (typeof WEEKDAYS)[number]),
                )
              }
              className="min-w-36 flex-1 [&_select]:md:text-small"
            >
              {WEEKDAYS.map((day) => (
                <NativeSelectOption key={day} value={day}>
                  {tDays(day)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Input
              id={fieldId('weeklyMeeting.time')}
              type="time"
              aria-label={t('meetingTime')}
              value={meeting.time}
              aria-invalid={error('weeklyMeeting.time') ? true : undefined}
              onChange={(event) => update((draft) => void (draft.weeklyMeeting.time = event.target.value))}
              className="w-28 md:text-small"
            />
            <span className="flex items-center gap-2">
              <span aria-hidden className="text-[13px] text-muted-ink">
                {t('onHome')}
              </span>
              <Switch
                size="sm"
                aria-label={t('onHomeLabel')}
                checked={meeting.showOnHome}
                onCheckedChange={(checked) =>
                  update((draft) => void (draft.weeklyMeeting.showOnHome = checked))
                }
              />
            </span>
          </div>
          {error('weeklyMeeting.time') && <FieldError>{error('weeklyMeeting.time')}</FieldError>}
        </fieldset>
        <LocalizedField
          id={fieldId('weeklyMeeting.room')}
          label={t('meetingRoom')}
          value={meeting.room}
          onChange={(value) => update((draft) => void (draft.weeklyMeeting.room = value))}
          error={error('weeklyMeeting.room.mk')}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span id="board-roles-label" className="text-small font-medium">
          {t('boardRoles')} <span className="font-normal text-muted-ink">· {t('dragHint')}</span>
        </span>
        <SortableList
          label={t('boardRoles')}
          items={values.boardRoles}
          itemName={(role) => role.title || t('newRole')}
          onReorder={(roles) => update((draft) => void (draft.boardRoles = roles))}
          className="overflow-hidden rounded-md border border-line"
          renderItem={(role, handle) => {
            const index = values.boardRoles.findIndex((candidate) => candidate.id === role.id);
            const titleError = error(`boardRoles.${index}.title`);
            const emailError = error(`boardRoles.${index}.email`);
            return (
              <div className="grid grid-cols-[32px_minmax(0,1fr)_36px] items-start gap-2 border-b border-divider p-2 sm:grid-cols-[32px_minmax(0,1fr)_minmax(0,1fr)_36px] sm:gap-2.5">
                <span className="flex h-(--control-h) items-center">{handle}</span>
                <div className="flex flex-col">
                  <Input
                    ref={(node) => {
                      if (node) roleRefs.current.set(role.id, node);
                      else roleRefs.current.delete(role.id);
                    }}
                    id={fieldId(`boardRoles.${index}.title`)}
                    aria-label={t('role')}
                    value={role.title}
                    aria-invalid={titleError ? true : undefined}
                    onChange={(event) =>
                      update((draft) => void (draft.boardRoles[index]!.title = event.target.value))
                    }
                    className="md:text-small"
                  />
                  {titleError && <FieldError>{titleError}</FieldError>}
                </div>
                <div className="col-start-2 flex flex-col sm:col-start-auto">
                  <Input
                    id={fieldId(`boardRoles.${index}.email`)}
                    type="email"
                    aria-label={`${t('roleEmail')} (${role.title || t('newRole')})`}
                    value={role.email}
                    aria-invalid={emailError ? true : undefined}
                    onChange={(event) =>
                      update((draft) => void (draft.boardRoles[index]!.email = event.target.value))
                    }
                    className="md:text-small"
                  />
                  {emailError && <FieldError>{emailError}</FieldError>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="col-start-3 row-start-1 size-9 text-muted-ink sm:col-start-auto sm:row-start-auto"
                  aria-label={t('removeRole', { role: role.title || t('newRole') })}
                  onClick={() => update((draft) => void draft.boardRoles.splice(index, 1))}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            );
          }}
        />
        <Button
          variant="quiet"
          size="sm"
          className="self-start"
          onClick={() => {
            const id = crypto.randomUUID();
            update((draft) => void draft.boardRoles.push({ id, title: '', email: '' }));
            focusRole.current = id;
          }}
        >
          <Plus aria-hidden />
          {t('addRole')}
        </Button>
      </div>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-small font-medium">
          {t('social')} <span className="font-normal text-muted-ink">· {t('socialHint')}</span>
        </legend>
        {values.socialLinks.map((link, index) => {
          const platform = PLATFORM_NAMES[link.platform];
          const urlError = error(`socialLinks.${index}.url`);
          return (
            <div
              key={link.platform}
              className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-2.5 sm:grid-cols-[24px_minmax(0,1fr)_minmax(0,1.4fr)]"
            >
              <span className="flex h-(--control-h) items-center text-ink">
                <SocialIcon name={link.platform} />
              </span>
              <Input
                aria-label={t('handle', { platform })}
                value={link.handle}
                onChange={(event) =>
                  update((draft) => void (draft.socialLinks[index]!.handle = event.target.value))
                }
                className="md:text-small"
              />
              <div className="col-start-2 flex flex-col sm:col-start-auto">
                <Input
                  id={fieldId(`socialLinks.${index}.url`)}
                  type="url"
                  aria-label={t('url', { platform })}
                  placeholder="https://"
                  value={link.url}
                  aria-invalid={urlError ? true : undefined}
                  onChange={(event) =>
                    update((draft) => void (draft.socialLinks[index]!.url = event.target.value))
                  }
                  className="md:text-small"
                />
                {urlError && <FieldError>{urlError}</FieldError>}
              </div>
            </div>
          );
        })}
      </fieldset>

      <div className="grid gap-4 border-t border-divider pt-4.5 md:grid-cols-2">
        {LEGAL_FIELDS.map(({ key, wide, placeholder }) => (
          <FormField
            key={key}
            id={fieldId(`legal.${key}`)}
            label={t(LEGAL_LABELS[key])}
            error={error(`legal.${key}`)}
            className={wide ? 'md:col-span-2' : undefined}
          >
            {(control) => (
              <Input
                {...control}
                value={values.legal[key]}
                placeholder={key === 'fullName' ? t('legalNamePlaceholder') : placeholder}
                onChange={(event) => update((draft) => void (draft.legal[key] = event.target.value))}
                className="md:text-small"
              />
            )}
          </FormField>
        ))}
      </div>
    </SettingsPanel>
  );
}
