'use client';

import { CircleAlert, Upload } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { useRouter } from '@/shared/i18n/navigation';
import { formatDate } from '@/shared/i18n/format';
import { cn } from '@/shared/lib/cn';
import { Chip } from '@/shared/ui/chip';
import { Button } from '@/shared/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog';
import { Switch } from '@/shared/ui/primitives/switch';

import { removeMyCv, setMyChoice, uploadMyCv } from '../../actions/my-privacy';
import { cvPickProblem, formatFileSize } from '../../domain/cv';
import type { CvInfo, MemberConsents, MyProfileView } from '../../types';

type Choice = 'newsletter' | 'galleryName' | 'cvOptIn';
type Problem = { fileName: string; key: 'cvType' | 'cvSize' | 'cvFailed' };

const ROW = 'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-t border-line py-[18px]';

/**
 * "Privacy & consent" (MyProfile, MyProfileStates): the account consent, two switches and CV sharing
 * with its states (off, on without a file, uploading, a problem, the file). Every change is saved at
 * once, and turning CV sharing off deletes the file after asking.
 */
export function PrivacyCard({ privacy }: { privacy: MyProfileView['privacy'] }) {
  const t = useTranslations('members.me.privacy');
  const errors = useTranslations('members.me.errors');
  const locale = useLocale();
  const router = useRouter();
  const [consents, setConsents] = React.useState<MemberConsents>(privacy.consents);
  const [cv, setCv] = React.useState<CvInfo | null>(privacy.cv);
  const [uploading, setUploading] = React.useState<string | null>(null);
  const [problem, setProblem] = React.useState<Problem | null>(null);
  const [stopping, setStopping] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);

  // What the server says wins when it changes (compared by content, reset while rendering).
  const serverKey = JSON.stringify([privacy.consents, privacy.cv]);
  const [seen, setSeen] = React.useState(serverKey);
  if (serverKey !== seen) {
    setSeen(serverKey);
    setConsents(privacy.consents);
    setCv(privacy.cv);
  }

  // Changes are sent one after the other (two quick clicks must not overtake each other), each one
  // shown at once and put back if it fails; the page refreshes when the last one is done.
  const queue = React.useRef<Promise<void>>(Promise.resolve());
  const waiting = React.useRef(0);

  function choose(key: Choice, value: boolean) {
    setConsents((current) => ({
      ...current,
      [key]: value,
      ...(key === 'cvOptIn' ? { cvConsentAt: value ? new Date().toISOString() : null } : {}),
    }));
    if (key === 'cvOptIn') setProblem(null);
    waiting.current += 1;
    queue.current = queue.current.then(async () => {
      try {
        const result = await setMyChoice({ [key]: value });
        if (!result.ok) throw new Error(result.error);
        if (key === 'cvOptIn') {
          setConsents((current) => ({
            ...current,
            cvOptIn: result.data.cvOptIn,
            cvConsentAt: result.data.cvConsentAt,
          }));
          if (!value) {
            setCv(null);
            toast.success(t('cvRemoved'));
          }
        }
      } catch {
        setConsents((current) => ({ ...current, [key]: !value }));
        toast.error(t('failed'), { duration: Infinity });
      } finally {
        waiting.current -= 1;
        if (waiting.current === 0) router.refresh();
      }
    });
  }

  async function upload(file: File) {
    const found = cvPickProblem(file);
    if (found) {
      setProblem({ fileName: file.name, key: found });
      return;
    }
    setProblem(null);
    setUploading(file.name);
    const data = new FormData();
    data.set('cv', file);
    try {
      const result = await uploadMyCv(data);
      if (result.ok) {
        setCv(result.data);
        router.refresh();
      } else {
        const key = result.error === 'validation' ? result.fieldErrors.cv?.[0] : null;
        setProblem({ fileName: file.name, key: key === 'cvType' || key === 'cvSize' ? key : 'cvFailed' });
      }
    } catch {
      setProblem({ fileName: file.name, key: 'cvFailed' });
    } finally {
      setUploading(null);
    }
  }

  async function removeFile() {
    const before = cv;
    setCv(null);
    try {
      const result = await removeMyCv();
      if (!result.ok) throw new Error(result.error);
      toast.success(t('cvRemoved'));
      router.refresh();
    } catch {
      setCv(before);
      toast.error(t('failed'), { duration: Infinity });
    }
  }

  const pick = (file: File | undefined | null) => {
    if (file) void upload(file);
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <div className="flex flex-col">
      <div className={cn(ROW, 'border-t-0 pt-0')}>
        <div className="flex flex-col gap-1">
          <strong className="text-body">{t('account.title')}</strong>
          <span className="text-small text-muted-ink">
            {t('account.text', {
              date: privacy.dataConsentAt ? formatDate(privacy.dataConsentAt, locale, 'date') : '–',
            })}
          </span>
        </div>
        <Chip>{t('required')}</Chip>
      </div>

      <SwitchRow
        id="mp-newsletter"
        title={t('newsletter.title')}
        text={t('newsletter.text')}
        checked={consents.newsletter}
        onChange={(value) => choose('newsletter', value)}
      />
      <SwitchRow
        id="mp-gallery"
        title={t('gallery.title')}
        text={t('gallery.text')}
        checked={consents.galleryName}
        onChange={(value) => choose('galleryName', value)}
      />

      <div className="border-t border-line py-[18px]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="flex flex-col gap-1">
            <strong id="mp-cv-title" className="text-body">
              {t('cv.title')}
            </strong>
            <span className="text-small text-muted-ink">
              {consents.cvOptIn && consents.cvConsentAt
                ? t('cv.consent', { date: formatDate(consents.cvConsentAt, locale, 'dateTime') })
                : t('cv.text')}
            </span>
          </div>
          <Switch
            aria-labelledby="mp-cv-title"
            checked={consents.cvOptIn}
            onCheckedChange={(value) => {
              // Turning it off with a file asks first (the file is deleted).
              if (!value && cv) setStopping(true);
              else choose('cvOptIn', value);
            }}
          />
        </div>
        {consents.cvOptIn && consents.cvConsentAt && (
          <p className="mt-1 text-small text-muted-ink">{t('cv.text')}</p>
        )}

        {!consents.cvOptIn && <p className="mt-3 text-small text-muted-ink">{t('cv.off')}</p>}

        {consents.cvOptIn && (
          <div className="mt-4 flex flex-col gap-3">
            {uploading ? (
              <FileRow name={uploading}>
                <div
                  role="progressbar"
                  aria-label={t('cv.uploading')}
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"
                >
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-ink motion-reduce:animate-none" />
                </div>
                <span className="mt-1 text-small text-muted-ink">{t('cv.uploading')}</span>
              </FileRow>
            ) : problem ? (
              <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-md border-2 border-brand bg-brand-tint p-3.5">
                <span
                  aria-hidden
                  className="flex h-12 w-10 items-end justify-center rounded-sm bg-muted-ink pb-1.5 text-[11px] font-bold text-white"
                >
                  {problem.fileName.split('.').pop()?.slice(0, 4).toUpperCase() ?? ''}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-body font-medium">{problem.fileName}</span>
                  <span
                    role="alert"
                    className="flex items-start gap-1.5 text-small font-medium text-brand-dark"
                  >
                    <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {errors(problem.key)}
                  </span>
                </span>
                <Button type="button" variant="quiet" size="sm" onClick={() => fileInput.current?.click()}>
                  {t('cv.choose')}
                </Button>
              </div>
            ) : cv ? (
              <div className="flex flex-col gap-2 rounded-md bg-surface p-4">
                <span className="text-small font-medium">{t('cv.label')}</span>
                <div className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3.5 rounded-md border border-line bg-white p-3 sm:grid-cols-[40px_minmax(0,1fr)_auto]">
                  <PdfBadge />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-body font-medium" data-testid="cv-name">
                      {cv.fileName}
                    </span>
                    <span className="text-small text-muted-ink">
                      {t('cv.file', {
                        size: formatFileSize(cv.size),
                        uploaded: formatDate(cv.uploadedAt, locale, 'date'),
                        consent: formatDate(consents.cvConsentAt ?? cv.uploadedAt, locale, 'date'),
                      })}
                    </span>
                  </span>
                  <span className="col-span-2 flex gap-2 sm:col-span-1">
                    <Button
                      type="button"
                      variant="quiet"
                      size="sm"
                      onClick={() => fileInput.current?.click()}
                    >
                      {t('cv.replace')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-brand-dark"
                      onClick={() => void removeFile()}
                    >
                      {t('cv.remove')}
                    </Button>
                  </span>
                </div>
                <span className="text-small text-muted-ink">
                  {t('cv.note')}
                  {privacy.cvViewsThisYear > 0 && ` ${t('cv.views', { count: privacy.cvViewsThisYear })}`}
                </span>
              </div>
            ) : (
              <>
                <label
                  htmlFor="mp-cv"
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    pick(event.dataTransfer.files[0]);
                  }}
                  className={cn(
                    'flex cursor-pointer flex-col items-center gap-1.5 rounded-md border-2 border-dashed border-line-strong px-4 py-7 text-center',
                    'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand',
                    dragging && 'border-brand bg-brand-tint',
                  )}
                >
                  <Upload className="size-5 text-brand" aria-hidden />
                  <span className="text-body">
                    {t.rich('cv.drop', {
                      strong: (chunks) => <strong className="font-bold">{chunks}</strong>,
                      browse: (chunks) => <span className="text-brand-dark">{chunks}</span>,
                    })}
                  </span>
                  <span className="text-small text-muted-ink">{t('cv.dropHelp')}</span>
                </label>
                <p className="text-small text-muted-ink">{t('cv.noCv')}</p>
              </>
            )}
            <input
              ref={fileInput}
              id="mp-cv"
              type="file"
              accept="application/pdf"
              className="sr-only"
              aria-label={t('cv.choose')}
              onChange={(event) => pick(event.target.files?.[0])}
            />
          </div>
        )}
      </div>

      <Dialog open={stopping} onOpenChange={setStopping}>
        <DialogContent role="alertdialog">
          <DialogHeader>
            <DialogTitle>{t('cv.stopTitle')}</DialogTitle>
            <DialogDescription className="text-small">
              {t('cv.stopText', { file: cv?.fileName ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="quiet" size="sm" onClick={() => setStopping(false)}>
              {t('cv.keep')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setStopping(false);
                choose('cvOptIn', false);
              }}
            >
              {t('cv.stop')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SwitchRow({
  id,
  title,
  text,
  checked,
  onChange,
}: {
  id: string;
  title: string;
  text: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className={ROW}>
      <div className="flex flex-col gap-1">
        <strong id={`${id}-title`} className="text-body">
          {title}
        </strong>
        <span className="text-small text-muted-ink">{text}</span>
      </div>
      <Switch id={id} aria-labelledby={`${id}-title`} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function PdfBadge() {
  return (
    <span
      aria-hidden
      className="flex h-12 w-10 items-end justify-center rounded-sm bg-brand pb-1.5 text-[11px] font-bold text-white"
    >
      PDF
    </span>
  );
}

function FileRow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3.5 rounded-md border border-line p-3.5">
      <PdfBadge />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-body font-medium">{name}</span>
        {children}
      </span>
    </div>
  );
}
