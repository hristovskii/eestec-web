'use client';

import { User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { type FieldErrors, fieldErrorsFrom } from '@/shared/forms/action-result';
import { useUnsavedChanges } from '@/shared/forms/use-unsaved-changes';
import { useRouter } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';
import { ErrorSummary, type FieldErrorItem } from '@/shared/ui/form/error-summary';
import { FieldError, FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog';
import { Input } from '@/shared/ui/primitives/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';
import { Textarea } from '@/shared/ui/primitives/textarea';

import { removeMyPhoto, saveMyPhoto, saveMyProfile } from '../../actions/my-profile';
import { photoPickProblem, SELF_LIMITS } from '../../domain/profile-self';
import type { MyProfileView } from '../../types';
import { PhotoCropper } from './photo-cropper';

// The schema (and zod with it) is fetched when the form is first used, not with the page.
const loadSchema = () => import('../../schemas/profile-self.schema');

const YEARS = ['1', '2', '3', '4', 'master', 'phd'] as const;
const FIELD_IDS = {
  name: 'mp-name',
  username: 'mp-username',
  bio: 'mp-bio',
  faculty: 'mp-faculty',
  year: 'mp-year',
  linkedinUrl: 'mp-linkedin',
  githubUrl: 'mp-github',
  phone: 'mp-phone',
} as const;
type Field = keyof typeof FIELD_IDS;
type Values = MyProfileView['values'];

const KNOWN_ERRORS = [
  'nameShort',
  'nameLong',
  'usernameInvalid',
  'usernameReserved',
  'usernameTaken',
  'bioLong',
  'urlInvalid',
  'urlHostLinkedin',
  'urlHostGithub',
  'facultyRequired',
  'yearRequired',
  'phoneInvalid',
  'photoType',
  'photoSize',
] as const;

type ErrorKey = (typeof KNOWN_ERRORS)[number] | 'unexpected';
const errorKey = (key: string): ErrorKey =>
  (KNOWN_ERRORS as readonly string[]).includes(key) ? (key as ErrorKey) : 'unexpected';

const sameValues = (a: Values, b: Values) => (Object.keys(a) as (keyof Values)[]).every((k) => a[k] === b[k]);

/**
 * The Profile card of /profile (MyProfile): photo, name, address, bio, faculty, year, links, phone, the
 * board's read-only facts (`board`, drawn by the server) and the save bar. The photo is saved as
 * soon as it is cropped; the rest with "Save changes".
 */
export function ProfileForm({
  initial,
  faculties,
  photo,
  initials,
  board,
}: {
  initial: Values;
  faculties: string[];
  photo: MyProfileView['photo'];
  initials: string;
  board: React.ReactNode;
}) {
  const t = useTranslations('members.me');
  const router = useRouter();
  const [saved, setSaved] = React.useState(initial);
  const [values, setValues] = React.useState(initial);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [sending, setSending] = React.useState(false);
  const [summaryTick, setSummaryTick] = React.useState(0);
  const [photoSrc, setPhotoSrc] = React.useState(photo?.src ?? null);
  const [picked, setPicked] = React.useState<File | null>(null);
  const [photoBusy, setPhotoBusy] = React.useState(false);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const summary = React.useRef<HTMLDivElement>(null);
  const dirty = !sameValues(values, saved);
  const leave = useUnsavedChanges(dirty);

  // The server may have a newer version (after a save elsewhere): start from it again. Compared by
  // content, because every refresh makes new objects; done while rendering, as React advises.
  const initialKey = JSON.stringify(initial);
  const [seenInitial, setSeenInitial] = React.useState(initialKey);
  if (initialKey !== seenInitial) {
    setSeenInitial(initialKey);
    setSaved(initial);
    setValues(initial);
  }
  const [seenPhoto, setSeenPhoto] = React.useState(photo?.src ?? null);
  if ((photo?.src ?? null) !== seenPhoto) {
    setSeenPhoto(photo?.src ?? null);
    setPhotoSrc(photo?.src ?? null);
  }

  // Moving focus after a failed save is done after rendering, never in a frame callback.
  React.useEffect(() => {
    if (summaryTick > 0) summary.current?.focus();
  }, [summaryTick]);

  const messageFor = (field: Field) => {
    const key = errors[field]?.[0];
    if (!key) return undefined;
    // The schema says `urlHost` for both links; the text names the site.
    const known = key === 'urlHost' ? (field === 'linkedinUrl' ? 'urlHostLinkedin' : 'urlHostGithub') : key;
    return t(`errors.${errorKey(known)}`);
  };

  const labels: Record<Field, string> = {
    name: t('profile.name'),
    username: t('profile.username'),
    bio: t('profile.bio'),
    faculty: t('profile.faculty'),
    year: t('profile.year'),
    linkedinUrl: t('profile.linkedin'),
    githubUrl: t('profile.github'),
    phone: t('profile.phone'),
  };
  const summaryItems: FieldErrorItem[] = (Object.keys(FIELD_IDS) as Field[])
    .filter((field) => errors[field])
    .map((field) => ({ fieldId: FIELD_IDS[field], message: messageFor(field) ?? '', label: labels[field] }));

  function set<K extends Field>(field: K, value: Values[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors(({ [field]: _removed, ...rest }) => rest);
  }

  async function save() {
    setSending(true);
    try {
      const { profileSelfSchema } = await loadSchema();
      const parsed = profileSelfSchema.safeParse(values);
      if (!parsed.success) {
        setErrors(fieldErrorsFrom(parsed.error.issues));
        setSummaryTick((tick) => tick + 1);
        return;
      }
      const result = await saveMyProfile(parsed.data);
      if (result.ok) {
        const next = { ...values, ...parsed.data, year: parsed.data.year };
        setSaved(next);
        setValues(next);
        setErrors({});
        const username = result.data.username;
        toast.success(t('toast.saved'), {
          action: { label: t('toast.view'), onClick: () => router.push(`/members/${username}`) },
        });
        router.refresh();
      } else if (result.error === 'validation') {
        setErrors(result.fieldErrors);
        setSummaryTick((tick) => tick + 1);
      } else {
        toast.error(t('toast.failed'), {
          duration: Infinity,
          action: { label: t('toast.retry'), onClick: () => void save() },
        });
      }
    } catch {
      toast.error(t('toast.failed'), {
        duration: Infinity,
        action: { label: t('toast.retry'), onClick: () => void save() },
      });
    } finally {
      setSending(false);
    }
  }

  function discard() {
    setValues(saved);
    setErrors({});
  }

  function pickPhoto(file: File | null) {
    if (!file) return;
    const problem = photoPickProblem(file);
    if (problem) {
      setPhotoError(problem);
      return;
    }
    setPhotoError(null);
    setPicked(file);
  }

  async function applyPhoto(blob: Blob) {
    setPicked(null);
    setPhotoBusy(true);
    const data = new FormData();
    data.set('photo', new File([blob], 'photo.jpg', { type: blob.type }));
    const result = await saveMyPhoto(data);
    setPhotoBusy(false);
    if (result.ok) {
      setPhotoSrc(result.data.src);
      router.refresh();
    } else {
      setPhotoError(
        result.error === 'validation' ? (result.fieldErrors.photo?.[0] ?? 'unexpected') : 'unexpected',
      );
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    const result = await removeMyPhoto();
    setPhotoBusy(false);
    if (result.ok) {
      setPhotoSrc(null);
      router.refresh();
    }
  }

  const bioLength = values.bio.length;
  const photoMessage = photoError ? t(`errors.${errorKey(photoError)}`) : null;

  return (
    <form
      noValidate
      aria-label={t('profile.title')}
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      onFocusCapture={() => void loadSchema()}
    >
      <div className="flex flex-col gap-5 px-5 pt-5 pb-7 sm:px-7">
        {summaryItems.length > 0 && (
          <ErrorSummary
            ref={summary}
            title={t('summary', { count: summaryItems.length })}
            errors={summaryItems}
          />
        )}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          <div
            className="flex size-[120px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface text-muted-ink"
            data-testid="profile-photo"
          >
            {photoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- the member's own photo from the photo store
              <img
                src={photoSrc}
                alt={t('profile.photoAlt', { name: values.name })}
                className="size-full object-cover"
              />
            ) : (
              <span className="flex flex-col items-center gap-1.5 text-[13px]">
                {initials ? (
                  <span aria-hidden className="text-h3 font-bold text-ink">
                    {initials}
                  </span>
                ) : (
                  <User className="size-7" aria-hidden />
                )}
                {t('profile.photoEmpty')}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2.5">
            <span id="mp-photo-label" className="text-small font-medium">
              {t('profile.photoLabel')}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="quiet" size="sm">
                <label htmlFor="mp-photo" className="cursor-pointer">
                  {photoBusy ? t('profile.photoSaving') : t('profile.photoChange')}
                </label>
              </Button>
              <input
                id="mp-photo"
                type="file"
                accept="image/jpeg,image/png"
                className="sr-only"
                aria-labelledby="mp-photo-label"
                aria-describedby={photoMessage ? 'mp-photo-error mp-photo-help' : 'mp-photo-help'}
                disabled={photoBusy}
                onChange={(event) => {
                  pickPhoto(event.target.files?.[0] ?? null);
                  event.target.value = '';
                }}
              />
              {photoSrc && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-brand-dark"
                  disabled={photoBusy}
                  onClick={() => void removePhoto()}
                >
                  {t('profile.photoRemove')}
                </Button>
              )}
            </div>
            {photoMessage && <FieldError id="mp-photo-error">{photoMessage}</FieldError>}
            <p id="mp-photo-help" className="text-small text-muted-ink">
              {t('profile.photoHelp')}
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id={FIELD_IDS.name} label={t('profile.name')} error={messageFor('name')}>
            {(control) => (
              <Input
                {...control}
                name="name"
                autoComplete="name"
                value={values.name}
                onChange={(event) => set('name', event.target.value)}
              />
            )}
          </FormField>
          <FormField
            id={FIELD_IDS.username}
            label={t('profile.username')}
            error={messageFor('username')}
            help={t('profile.usernameHelp')}
          >
            {(control) => (
              <div
                className={cn(
                  'flex h-12 items-stretch overflow-hidden rounded-sm border border-line-strong bg-white',
                  'focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/30',
                  control['aria-invalid'] && 'border-2 border-brand',
                )}
              >
                <span className="flex items-center border-r border-line bg-surface px-3 text-[15px] whitespace-nowrap text-muted-ink">
                  {t('profile.usernamePrefix')}
                </span>
                <input
                  {...control}
                  name="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={SELF_LIMITS.usernameMax + 10}
                  value={values.username}
                  onChange={(event) => set('username', event.target.value)}
                  className="min-w-0 flex-1 border-0 px-3 text-body text-ink outline-none"
                />
              </div>
            )}
          </FormField>
        </div>

        <FormField
          id={FIELD_IDS.bio}
          label={t('profile.bio')}
          error={messageFor('bio')}
          counter={
            <span className={cn(bioLength > SELF_LIMITS.bioMax && 'font-medium text-brand-dark')}>
              {t('profile.bioCounter', { count: bioLength, max: SELF_LIMITS.bioMax })}
            </span>
          }
        >
          {(control) => (
            <Textarea
              {...control}
              name="bio"
              rows={4}
              value={values.bio}
              onChange={(event) => set('bio', event.target.value)}
            />
          )}
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id={FIELD_IDS.faculty} label={t('profile.faculty')} error={messageFor('faculty')}>
            {(control) => (
              <NativeSelect
                {...control}
                name="faculty"
                value={values.faculty}
                onChange={(event) => set('faculty', event.target.value)}
              >
                <NativeSelectOption value="">{t('profile.facultyChoose')}</NativeSelectOption>
                {/* A faculty the board has since removed from the list stays selectable for who has it. */}
                {(faculties.includes(values.faculty) || values.faculty === ''
                  ? faculties
                  : [values.faculty, ...faculties]
                ).map((faculty) => (
                  <NativeSelectOption key={faculty} value={faculty}>
                    {faculty}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField id={FIELD_IDS.year} label={t('profile.year')} error={messageFor('year')}>
            {(control) => (
              <NativeSelect
                {...control}
                name="year"
                value={values.year}
                onChange={(event) => set('year', event.target.value)}
              >
                <NativeSelectOption value="">{t('profile.yearChoose')}</NativeSelectOption>
                {YEARS.map((year) => (
                  <NativeSelectOption key={year} value={year}>
                    {t(`years.${year}`)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField
            id={FIELD_IDS.linkedinUrl}
            label={t('profile.linkedin')}
            optional
            error={messageFor('linkedinUrl')}
          >
            {(control) => (
              <Input
                {...control}
                name="linkedinUrl"
                type="url"
                inputMode="url"
                autoComplete="off"
                value={values.linkedinUrl}
                onChange={(event) => set('linkedinUrl', event.target.value)}
              />
            )}
          </FormField>
          <FormField
            id={FIELD_IDS.githubUrl}
            label={t('profile.github')}
            optional
            error={messageFor('githubUrl')}
          >
            {(control) => (
              <Input
                {...control}
                name="githubUrl"
                type="url"
                inputMode="url"
                autoComplete="off"
                value={values.githubUrl}
                onChange={(event) => set('githubUrl', event.target.value)}
              />
            )}
          </FormField>
          <FormField
            id={FIELD_IDS.phone}
            label={
              <>
                {t('profile.phone')}{' '}
                <span className="font-normal text-muted-ink">· {t('profile.phoneNote')}</span>
              </>
            }
            error={messageFor('phone')}
          >
            {(control) => (
              <Input
                {...control}
                name="phone"
                type="tel"
                autoComplete="tel"
                value={values.phone}
                onChange={(event) => set('phone', event.target.value)}
              />
            )}
          </FormField>
        </div>

        {board}
      </div>

      {(dirty || sending) && (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 rounded-b-lg border-t border-line bg-surface px-5 py-4 sm:px-7">
          <span className="mr-auto flex items-center gap-2 text-small" role="status">
            <span aria-hidden className="size-2 rounded-full bg-brand" />
            {t('saveBar.unsaved')}
          </span>
          <Button type="button" variant="quiet" size="sm" disabled={sending} onClick={discard}>
            {t('saveBar.discard')}
          </Button>
          <Button type="submit" size="sm" disabled={sending}>
            {sending ? t('saveBar.saving') : t('saveBar.save')}
          </Button>
        </div>
      )}

      <PhotoCropper file={picked} onCancel={() => setPicked(null)} onUse={(blob) => void applyPhoto(blob)} />

      <Dialog open={leave.open} onOpenChange={(open) => !open && leave.stay()}>
        <DialogContent role="alertdialog">
          <DialogHeader>
            <DialogTitle>{t('leave.title')}</DialogTitle>
            <DialogDescription className="text-small">{t('leave.text')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="quiet" size="sm" onClick={leave.stay}>
              {t('leave.stay')}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => {
                discard();
                leave.leave();
              }}
            >
              {t('leave.leave')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
