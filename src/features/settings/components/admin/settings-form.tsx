'use client';

import { Check, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { AdminPage, AdminPageHeader } from '@/shared/admin-ui/admin-page';
import { UnsavedChangesDialog } from '@/shared/admin-ui/dialogs';
import type { FieldErrors } from '@/shared/forms/action-result';
import { useUnsavedChanges } from '@/shared/forms/use-unsaved-changes';
import { cn } from '@/shared/lib/cn';
import { ErrorSummary } from '@/shared/ui/form/error-summary';
import { Button } from '@/shared/ui/primitives/button';

import { saveSettings } from '../../actions/save-settings';
import { SETTINGS_LIMITS, SETTINGS_SECTIONS } from '../../schemas/settings.schema';
import type { SettingsInput, SettingsRecord } from '../../types';
import { BrandingSection, EventsSection } from './branding-events';
import { ContactSection } from './contact-section';
import { fieldId } from './form-kit';
import { ActivitySection, LanguagesSection, NotificationsSection, SecuritySection } from './other-sections';
import { SeoSection } from './seo-section';

const toInput = ({ privacy: _privacy, ...input }: SettingsRecord): SettingsInput => input;

type SettingsFormProps = {
  record: SettingsRecord;
  phase2: boolean;
  lockout: { attempts: number; minutes: number };
  /** Latest activity (ActivityFeed, composed by the route). */
  activity: React.ReactNode;
};

/** /admin/settings (AdminSettings): one form, one "Save changes", sections with a sub-nav. */
export function SettingsForm({ record, phase2, lockout, activity }: SettingsFormProps) {
  const t = useTranslations('admin.settings');
  const [saved, setSaved] = React.useState(() => toInput(record));
  const [values, setValues] = React.useState(saved);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [pending, startTransition] = React.useTransition();
  const summaryRef = React.useRef<HTMLDivElement>(null);

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const guard = useUnsavedChanges(dirty);

  const update = React.useCallback((recipe: (draft: SettingsInput) => void) => {
    setValues((current) => {
      const draft = structuredClone(current);
      recipe(draft);
      return draft;
    });
  }, []);

  const message = (key: string, path: string): string => {
    if (key === 'range') {
      const field = path.split('.').at(-1) as keyof typeof SETTINGS_LIMITS;
      const [min, max] = SETTINGS_LIMITS[field] ?? [0, 0];
      return t('errors.range', { min, max });
    }
    const known = ['required', 'tooLong', 'email', 'url', 'time', 'number', 'tooMany', 'recipientsRequired'];
    return t(`errors.${known.includes(key) ? key : 'unexpected'}` as Parameters<typeof t>[0]);
  };
  const error = (path: string) => {
    const key = fieldErrors[path]?.[0];
    return key ? message(key, path) : undefined;
  };

  const labelFor = (path: string): string => {
    const [head, a = '', b = ''] = path.split('.');
    switch (head ?? '') {
      case 'siteName':
        return t('branding.siteName');
      case 'footerTagline':
        return t('branding.footerTagline');
      case 'contact':
        return t(`contact.${a as 'mainEmail' | 'address' | 'officeRoom'}`);
      case 'weeklyMeeting':
        return a === 'time'
          ? `${t('contact.meeting')} › ${t('contact.meetingTime')}`
          : t('contact.meetingRoom');
      case 'boardRoles': {
        const role = values.boardRoles[Number(a)]?.title || t('contact.newRole');
        return `${t('contact.boardRoles')} › ${role}${b === 'email' ? ` › ${t('contact.roleEmail')}` : ''}`;
      }
      case 'socialLinks':
        return `${t('contact.social')} › ${values.socialLinks[Number(a)]?.platform ?? ''}`;
      case 'legal':
        return t(`contact.${a === 'fullName' ? 'legalName' : (a as 'taxNumber')}`);
      case 'events':
        return t(
          `events.${({ deadlineSoonHours: 'deadlineSoon', justEndedDays: 'justEnded', defaultMaxParticipants: 'maxParticipants' } as const)[a as 'justEndedDays'] ?? 'deadlineSoon'}`,
        );
      case 'seo':
        return `${t('sections.seo')} › ${t(`seo.pages.${a as 'home'}`)} › ${t(b === 'title' ? 'seo.pageTitle' : 'seo.pageDescription')}`;
      case 'notifications':
        return t(`notifications.kinds.${a as 'contactMessages'}`);
      case 'retentionMonths':
        return t('security.retention');
      default:
        return path;
    }
  };

  // One summary line per field (a localized field reports once, for MK).
  const summary = Object.entries(fieldErrors)
    .filter(([path]) => !path.endsWith('.en'))
    .map(([path, keys]) => ({
      fieldId: fieldId(path),
      label: labelFor(path),
      message: message(keys[0]!, path),
    }))
    .filter((item, index, all) => all.findIndex((other) => other.fieldId === item.fieldId) === index);

  const save = () =>
    new Promise<boolean>((resolve) =>
      startTransition(async () => {
        const result = await saveSettings(values);
        if (result.ok) {
          const next = toInput(result.data);
          setSaved(next);
          setValues(next);
          setFieldErrors({});
          toast.success(t('savedToast'));
          resolve(true);
        } else if (result.error === 'validation') {
          setFieldErrors(result.fieldErrors);
          requestAnimationFrame(() => summaryRef.current?.focus());
          resolve(false);
        } else {
          toast.error(t(result.error === 'forbidden' ? 'errors.forbidden' : 'errors.unexpected'));
          resolve(false);
        }
      }),
    );

  const sectionProps = { values, update, error };

  return (
    <AdminPage className="xl:max-w-[1240px]">
      <div className="z-10 -mx-4 bg-surface px-4 pt-1 pb-3 md:-mx-6 md:px-6 lg:sticky lg:top-15 xl:-mx-8 xl:px-8">
        <AdminPageHeader
          title={t('title')}
          description={t('description')}
          actions={
            <span className="flex items-center gap-3">
              <span role="status" className="flex items-center gap-1.5 text-[13px] text-muted-ink">
                {pending ? (
                  <>
                    <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
                    {t('saving')}
                  </>
                ) : dirty ? (
                  <>
                    <span aria-hidden className="size-2 rounded-full bg-brand" />
                    <span className="font-medium text-ink">{t('unsaved')}</span>
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" aria-hidden />
                    {t('saved')}
                  </>
                )}
              </span>
              <Button
                size="sm"
                onClick={() => void save()}
                disabled={!dirty || pending}
                aria-busy={pending || undefined}
              >
                {t('save')}
              </Button>
            </span>
          }
        />
      </div>

      {summary.length > 0 && (
        <ErrorSummary
          ref={summaryRef}
          title={t('errorSummary', { count: summary.length })}
          errors={summary}
        />
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-6">
        <SectionNav />
        <div className="flex min-w-0 flex-col gap-5">
          <BrandingSection {...sectionProps} />
          <EventsSection {...sectionProps} />
          <ContactSection {...sectionProps} />
          <SeoSection {...sectionProps} phase2={phase2} siteName={values.siteName} />
          <NotificationsSection {...sectionProps} phase2={phase2} />
          <LanguagesSection />
          <ActivitySection>{activity}</ActivitySection>
          <SecuritySection {...sectionProps} lockout={lockout} />
        </div>
      </div>

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

/** Sticky sub-nav (desktop) / scrolling chips (mobile); the section in view is marked. */
function SectionNav() {
  const t = useTranslations('admin.settings');
  const [active, setActive] = React.useState<string>(SETTINGS_SECTIONS[0]);

  // The section being read: the last one whose top has passed under the sticky header.
  React.useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let current: string = SETTINGS_SECTIONS[0];
        for (const section of SETTINGS_SECTIONS) {
          const top = document.getElementById(section)?.getBoundingClientRect().top ?? Infinity;
          if (top <= 200) current = section;
        }
        // At the very bottom, the last sections may never reach the top: mark the last one.
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        setActive(atBottom ? SETTINGS_SECTIONS.at(-1)! : current);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <nav
      aria-label={t('sectionsNav')}
      className="-mx-4 overflow-x-auto px-4 lg:sticky lg:top-40 lg:mx-0 lg:overflow-visible lg:px-0"
    >
      <ul className="flex gap-1 lg:flex-col lg:gap-0.5">
        {SETTINGS_SECTIONS.map((section) => (
          <li key={section}>
            <a
              href={`#${section}`}
              aria-current={active === section ? 'true' : undefined}
              onClick={() => setActive(section)}
              className={cn(
                'flex h-9 items-center rounded-sm px-3 text-small whitespace-nowrap no-underline',
                'focus-visible:outline-2 focus-visible:outline-brand',
                active === section
                  ? 'bg-white font-bold text-ink shadow-[0_0_0_1px_var(--color-line)]'
                  : 'text-ink-2 hover:bg-divider',
              )}
            >
              {t(`sections.${section}`)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
