'use client';

import { FileText, Library } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { formatBytes } from '@/features/media';
import { MediaPicker } from '@/features/media/admin';
import { FormSection, SwitchRow } from '@/shared/admin-ui/form-section';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import { LocalizedListField } from '@/shared/admin-ui/localized-list-field';
import { AddRow, RowList } from '@/shared/admin-ui/row-list';
import { useFocusAdded } from '@/shared/admin-ui/use-focus-added';
import { resolveLocalized } from '@/shared/i18n/localized';
import { FieldError, FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import { PARTNERS_LIMITS as LIMIT } from '../../schemas/partners.schema';
import { PARTNER_ICONS, type PartnerCard, type PartnerIcon } from '../../types';
import { PartnerIconView } from '../partner-icon';
import { fieldId, Loc, newId, type SectionProps } from './form-kit';

const nameOf = (value: { mk: string; en?: string }, fallback: string) =>
  resolveLocalized(value, 'en').trim() || fallback;

// ─── Hero and "Who you reach" ───

export function HeroSection(props: SectionProps) {
  const t = useTranslations('admin.partners.hero');
  const tSections = useTranslations('admin.partners.sections');
  return (
    <FormSection id="hero" title={tSections('hero')} aside={t('aside')}>
      <Loc
        section={props}
        path="hero.eyebrow"
        label={t('eyebrow')}
        help={t('eyebrowHelp')}
        max={LIMIT.eyebrow}
      />
      <Loc section={props} path="hero.title" label={t('title')} required max={LIMIT.title} />
      <Loc section={props} path="hero.lead" label={t('lead')} required multiline max={LIMIT.lead} />
      <div className="grid gap-4 md:grid-cols-2">
        <Loc section={props} path="hero.primaryLabel" label={t('primaryLabel')} required max={LIMIT.button} />
        <Loc
          section={props}
          path="hero.offerLabel"
          label={t('offerLabel')}
          help={t('offerLabelHelp')}
          required
          max={LIMIT.button}
        />
      </div>
    </FormSection>
  );
}

export function ReachSection(props: SectionProps) {
  const { values, update, error } = props;
  const t = useTranslations('admin.partners.reach');
  const tSections = useTranslations('admin.partners.sections');
  const focusAdded = useFocusAdded(values.reach.stats.length);
  return (
    <FormSection id="reach" title={tSections('reach')} aside={t('aside')}>
      <Loc section={props} path="reach.title" label={t('title')} max={LIMIT.title} />
      <RowList
        label={t('list')}
        items={values.reach.stats}
        onReorder={(items) => update((draft) => void (draft.reach.stats = items))}
        itemName={(item) => nameOf(item.value, t('new'))}
        removeLabel={(name) => t('remove', { name })}
        onRemove={(index) => update((draft) => void draft.reach.stats.splice(index, 1))}
        fields={(_item, index) => (
          <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
            <Loc
              section={props}
              path={`reach.stats.${index}.value`}
              label={t('value')}
              required
              max={LIMIT.statValue}
            />
            <Loc
              section={props}
              path={`reach.stats.${index}.label`}
              label={t('label')}
              required
              max={LIMIT.statLabel}
            />
          </div>
        )}
      />
      <AddRow
        label={t('add')}
        full={values.reach.stats.length >= LIMIT.stats}
        fullText={t('full', { max: LIMIT.stats })}
        error={error('reach.stats')}
        onAdd={() => {
          focusAdded(fieldId(`reach.stats.${values.reach.stats.length}.value`));
          update(
            (draft) =>
              void draft.reach.stats.push({ id: newId('reach'), value: { mk: '' }, label: { mk: '' } }),
          );
        }}
      />
    </FormSection>
  );
}

// ─── Cards with an icon ("What your company gets", single collaborations) ───

function IconSelect({
  id,
  value,
  onChange,
  label,
}: {
  id: string;
  value: PartnerIcon;
  onChange: (icon: PartnerIcon) => void;
  label: string;
}) {
  const t = useTranslations('admin.partners.icons');
  return (
    <FormField id={id} label={label}>
      {(control) => (
        <div className="flex items-center gap-2">
          <span className="flex size-(--control-h) shrink-0 items-center justify-center rounded-md bg-surface">
            <PartnerIconView icon={value} className="size-5" />
          </span>
          <NativeSelect
            {...control}
            value={value}
            onChange={(event) => onChange(event.target.value as PartnerIcon)}
            className="min-w-0 flex-1 [&_select]:md:text-small"
          >
            {PARTNER_ICONS.map((icon) => (
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

function CardsSection({
  id,
  path,
  items,
  max,
  title,
  aside,
  head,
  strings,
  ...props
}: SectionProps & {
  id: string;
  path: 'why.cards' | 'packages.singles';
  items: PartnerCard[];
  max: number;
  title: string;
  aside: string;
  /** Fields above the cards (eyebrow and title of the section). */
  head?: React.ReactNode;
  strings: { list: string; new: string; add: string; remove: (name: string) => string; full: string };
}) {
  const { update, error } = props;
  const t = useTranslations('admin.partners.cards');
  const focusAdded = useFocusAdded(items.length);
  const select = (draft: SectionProps['values']) =>
    path === 'why.cards' ? draft.why.cards : draft.packages.singles;
  return (
    <FormSection id={id} title={title} aside={aside}>
      {head}
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
              <Loc
                section={props}
                path={`${path}.${index}.title`}
                label={t('title')}
                required
                max={LIMIT.cardTitle}
              />
            </div>
            <Loc
              section={props}
              path={`${path}.${index}.text`}
              label={t('text')}
              required
              multiline
              max={LIMIT.cardText}
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

export function WhySection(props: SectionProps) {
  const t = useTranslations('admin.partners.why');
  const tSections = useTranslations('admin.partners.sections');
  return (
    <CardsSection
      {...props}
      id="why"
      path="why.cards"
      items={props.values.why.cards}
      max={LIMIT.cards}
      title={tSections('why')}
      aside={t('aside')}
      head={
        <>
          <Loc section={props} path="why.eyebrow" label={t('eyebrow')} max={LIMIT.eyebrow} />
          <Loc section={props} path="why.title" label={t('title')} required max={LIMIT.title} />
        </>
      }
      strings={{
        list: t('list'),
        new: t('new'),
        add: t('add'),
        remove: (name) => t('remove', { name }),
        full: t('full', { max: LIMIT.cards }),
      }}
    />
  );
}

export function SinglesSection(props: SectionProps) {
  const t = useTranslations('admin.partners.singles');
  const tSections = useTranslations('admin.partners.sections');
  return (
    <CardsSection
      {...props}
      id="singles"
      path="packages.singles"
      items={props.values.packages.singles}
      max={LIMIT.singles}
      title={tSections('singles')}
      aside={t('aside')}
      head={
        <Loc
          section={props}
          path="packages.singlesTitle"
          label={t('title')}
          help={t('titleHelp')}
          max={LIMIT.title}
        />
      }
      strings={{
        list: t('list'),
        new: t('new'),
        add: t('add'),
        remove: (name) => t('remove', { name }),
        full: t('full', { max: LIMIT.singles }),
      }}
    />
  );
}

// ─── Packages ───

export function PackagesSection(props: SectionProps) {
  const { values, update, error } = props;
  const t = useTranslations('admin.partners.packages');
  const tSections = useTranslations('admin.partners.sections');
  const focusAdded = useFocusAdded(values.packages.items.length);
  const packages = values.packages.items;
  return (
    <FormSection id="packages" title={tSections('packages')} aside={t('aside')}>
      <Loc section={props} path="packages.eyebrow" label={t('eyebrow')} max={LIMIT.eyebrow} />
      <Loc section={props} path="packages.title" label={t('title')} required max={LIMIT.title} />
      <Loc
        section={props}
        path="packages.note"
        label={t('note')}
        help={t('noteHelp')}
        multiline
        max={LIMIT.note}
      />
      <Loc
        section={props}
        path="packages.badge"
        label={t('badge')}
        help={t('badgeHelp')}
        required
        max={LIMIT.badge}
      />
      <RowList
        label={t('list')}
        items={packages}
        onReorder={(items) => update((draft) => void (draft.packages.items = items))}
        itemName={(item) => nameOf(item.name, t('new'))}
        removeLabel={(name) => t('remove', { name })}
        onRemove={(index) => update((draft) => void draft.packages.items.splice(index, 1))}
        fields={(item, index) => {
          const base = `packages.items.${index}`;
          return (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Loc
                  section={props}
                  path={`${base}.name`}
                  label={t('name')}
                  required
                  max={LIMIT.packageName}
                />
                <Loc
                  section={props}
                  path={`${base}.priceText`}
                  label={t('price')}
                  help={t('priceHelp')}
                  max={LIMIT.price}
                />
              </div>
              <Loc
                section={props}
                path={`${base}.text`}
                label={t('text')}
                required
                multiline
                max={LIMIT.packageText}
              />
              <LocalizedListField
                label={t('contents')}
                items={item.items}
                onChange={(next) => update((draft) => void (draft.packages.items[index]!.items = next))}
                fieldId={(row) => fieldId(`${base}.items.${row}.text`)}
                error={(row) => error(`${base}.items.${row}.text.mk`)}
                listError={error(`${base}.items`)}
                maxItems={LIMIT.packageItems}
                maxLength={LIMIT.packageItem}
                text={{
                  item: (number) => t('contentsItem', { number }),
                  add: t('contentsAdd'),
                  remove: (number) => t('contentsRemove', { number }),
                  empty: t('contentsEmpty'),
                  full: t('contentsFull', { max: LIMIT.packageItems }),
                }}
                newId={() => newId('line')}
              />
              <Loc section={props} path={`${base}.cta`} label={t('cta')} required max={LIMIT.button} />
              <SwitchRow
                id={fieldId(`${base}.highlighted`)}
                label={t('highlighted')}
                checked={item.highlighted}
                onChange={(on) =>
                  update((draft) => {
                    // Only one card is "Most chosen": choosing this one clears the others.
                    draft.packages.items.forEach((other, position) => {
                      other.highlighted = on && position === index;
                    });
                  })
                }
              />
            </>
          );
        }}
      />
      <AddRow
        label={t('add')}
        full={packages.length >= LIMIT.packages}
        fullText={t('full', { max: LIMIT.packages })}
        error={error('packages.items')}
        onAdd={() => {
          focusAdded(fieldId(`packages.items.${packages.length}.name`));
          update(
            (draft) =>
              void draft.packages.items.push({
                id: newId('package'),
                name: { mk: '' },
                text: { mk: '' },
                priceText: { mk: '' },
                items: [],
                highlighted: false,
                cta: { mk: '' },
              }),
          );
        }}
      />
    </FormSection>
  );
}

// ─── Partnership offer (PDF) ───

export function OfferSection(props: SectionProps) {
  const { values, update, error, media, addMedia } = props;
  const t = useTranslations('admin.partners.offer');
  const tSections = useTranslations('admin.partners.sections');
  const [picking, setPicking] = React.useState(false);
  const file = values.offer.mediaId ? media[values.offer.mediaId] : undefined;
  return (
    <FormSection id="offer" title={tSections('offer')} aside={t('aside')}>
      <p className="text-small text-muted-ink">{t('help')}</p>
      <div className="flex flex-col gap-2">
        <span className="text-small font-medium">{t('file')}</span>
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
          <Button variant="quiet" size="sm" onClick={() => setPicking(true)}>
            <Library aria-hidden />
            {t(file ? 'replace' : 'choose')}
          </Button>
          {file && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => update((draft) => void (draft.offer.mediaId = ''))}
            >
              {t('remove')}
            </Button>
          )}
        </div>
      </div>
      <Loc section={props} path="offer.title" label={t('title')} max={LIMIT.title} />
      <Loc section={props} path="offer.text" label={t('text')} multiline max={LIMIT.note} />
      <div className="grid gap-4 md:grid-cols-2">
        <Loc section={props} path="offer.pages" label={t('pages')} help={t('pagesHelp')} max={LIMIT.pages} />
        <Loc
          section={props}
          path="offer.downloadLabel"
          label={t('downloadLabel')}
          required
          max={LIMIT.button}
        />
      </div>
      {error('offer.mediaId') && <FieldError>{error('offer.mediaId')}</FieldError>}
      <MediaPicker
        open={picking}
        onOpenChange={setPicking}
        onPick={(item) => {
          addMedia(item);
          update((draft) => void (draft.offer.mediaId = item.id));
          setPicking(false);
        }}
        kind="document"
        allowSamples
        currentId={values.offer.mediaId || null}
      />
    </FormSection>
  );
}

// ─── Partners wall and contact ───

export function WallSection(props: SectionProps) {
  const t = useTranslations('admin.partners.wall');
  const tSections = useTranslations('admin.partners.sections');
  return (
    <FormSection id="wall" title={tSections('wall')} aside={t('aside')}>
      <p className="text-small text-muted-ink">{t('help')}</p>
      <Loc section={props} path="partners.eyebrow" label={t('eyebrow')} max={LIMIT.eyebrow} />
      <Loc section={props} path="partners.title" label={t('title')} required max={LIMIT.title} />
      <Loc section={props} path="partners.pastTitle" label={t('pastTitle')} required max={LIMIT.title} />
    </FormSection>
  );
}

export function ContactSection(props: SectionProps) {
  const { values, update, error } = props;
  const t = useTranslations('admin.partners.contact');
  const tSections = useTranslations('admin.partners.sections');
  const person = values.contact.person;
  return (
    <FormSection id="contact" title={tSections('contact')} aside={t('aside')}>
      <Loc section={props} path="contact.eyebrow" label={t('eyebrow')} max={LIMIT.eyebrow} />
      <Loc section={props} path="contact.title" label={t('title')} required max={LIMIT.title} />
      <Loc section={props} path="contact.text" label={t('text')} multiline max={LIMIT.note} />
      <div className="flex flex-col gap-3.5 rounded-md bg-surface p-3.5">
        <span className="text-small font-bold">{t('person')}</span>
        <p className="text-[13px] text-muted-ink">{t('personHelp')}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <FormField
            id={fieldId('contact.person.name')}
            label={t('personName')}
            required
            error={error('contact.person.name')}
          >
            {(control) => (
              <Input
                {...control}
                autoComplete="off"
                value={person.name}
                maxLength={LIMIT.personName}
                onChange={(event) => update((draft) => void (draft.contact.person.name = event.target.value))}
              />
            )}
          </FormField>
          <FormField
            id={fieldId('contact.person.email')}
            label={t('personEmail')}
            help={t('personEmailHelp')}
            required
            error={error('contact.person.email')}
          >
            {(control) => (
              <Input
                {...control}
                type="email"
                autoComplete="off"
                value={person.email}
                onChange={(event) =>
                  update((draft) => void (draft.contact.person.email = event.target.value.trim()))
                }
              />
            )}
          </FormField>
        </div>
        <LocalizedField
          id={fieldId('contact.person.role')}
          label={t('personRole')}
          value={person.role}
          onChange={(value) => update((draft) => void (draft.contact.person.role = value))}
          error={error('contact.person.role.mk')}
          maxLength={LIMIT.title}
        />
      </div>
    </FormSection>
  );
}
