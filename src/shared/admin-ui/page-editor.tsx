'use client';

import { Check, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import type { ActionResult, FieldErrors } from '@/shared/forms/action-result';
import { useUnsavedChanges } from '@/shared/forms/use-unsaved-changes';
import { cn } from '@/shared/lib/cn';
import { ErrorSummary, type FieldErrorItem } from '@/shared/ui/form/error-summary';
import { Notice } from '@/shared/ui/notice';
import { Button } from '@/shared/ui/primitives/button';

import { AdminPage, AdminPageHeader } from './admin-page';
import { UnsavedChangesDialog } from './dialogs';

// The page editors of Admin › Pages (Home, Journey, Join Us, Sponsors, Contact): one form, one
// "Save changes", a sticky header with the save state, an error summary, a sub-nav of sections and
// the "unsaved changes" guard. A page supplies its values, its action and its sections.

type PageEditorOptions<T> = {
  record: T;
  /** The server action: validates, stores and returns the stored result (or field errors). */
  save: (values: T) => Promise<ActionResult<T>>;
  /** Translated messages of the toasts. */
  messages: { saved: string; forbidden: string; unexpected: string };
};

export type PageEditor<T extends object> = ReturnType<typeof usePageEditor<T>>;

export function usePageEditor<T extends object>({ record, save, messages }: PageEditorOptions<T>) {
  const [saved, setSaved] = React.useState<T>(record);
  const [values, setValues] = React.useState<T>(record);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [pending, startTransition] = React.useTransition();
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const guard = useUnsavedChanges(dirty);

  /** Change the values: the recipe mutates a copy. */
  const update = React.useCallback((recipe: (draft: T) => void) => {
    setValues((current) => {
      const draft = structuredClone(current);
      recipe(draft);
      return draft;
    });
  }, []);

  const submit = () =>
    new Promise<boolean>((resolve) =>
      startTransition(async () => {
        const result = await save(values);
        if (result.ok) {
          setSaved(result.data);
          setValues(result.data);
          setFieldErrors({});
          toast.success(messages.saved);
          resolve(true);
        } else if (result.error === 'validation') {
          setFieldErrors(result.fieldErrors);
          resolve(false);
        } else {
          toast.error(result.error === 'forbidden' ? messages.forbidden : messages.unexpected);
          resolve(false);
        }
      }),
    );

  return {
    values,
    update,
    dirty,
    pending,
    fieldErrors,
    /** First error key of a field path ("milestones.2.year"), if any. */
    errorKey: (path: string) => fieldErrors[path]?.[0],
    submit,
    discard: () => setValues(saved),
    guard,
  };
}

type PageEditorFrameProps<T extends object> = {
  editor: PageEditor<T>;
  title: string;
  description: string;
  canEdit: boolean;
  /** "You can look at this page, but only…" for people who can't edit. */
  readOnlyNote: string;
  sections: readonly { id: string; label: string }[];
  sectionsNavLabel: string;
  /** Summary lines, one per field with a problem (the page words them). */
  errors: FieldErrorItem[];
  errorSummaryTitle: string;
  /** Between the header and the sections (tabs of a page that has more than one). */
  aboveContent?: React.ReactNode;
  children: React.ReactNode;
};

/** The shell around a page's sections. */
export function PageEditorFrame<T extends object>({
  editor,
  title,
  description,
  canEdit,
  readOnlyNote,
  sections,
  sectionsNavLabel,
  errors,
  errorSummaryTitle,
  aboveContent,
  children,
}: PageEditorFrameProps<T>) {
  const t = useTranslations('admin.ui.pageEditor');
  const { dirty, pending, guard, fieldErrors } = editor;
  const summaryRef = React.useRef<HTMLDivElement>(null);

  // The error summary takes focus when a save finds problems (it is rendered by then).
  React.useEffect(() => {
    if (Object.keys(fieldErrors).length > 0) summaryRef.current?.focus();
  }, [fieldErrors]);

  return (
    <AdminPage className="xl:max-w-[1240px]">
      <div className="z-10 -mx-4 bg-surface px-4 pt-1 pb-3 md:-mx-6 md:px-6 lg:sticky lg:top-15 xl:-mx-8 xl:px-8">
        <AdminPageHeader
          title={title}
          description={description}
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
                onClick={() => void editor.submit()}
                disabled={!canEdit || !dirty || pending}
                aria-busy={pending || undefined}
              >
                {t('save')}
              </Button>
            </span>
          }
        />
      </div>

      {aboveContent}

      {!canEdit && <Notice tone="info">{readOnlyNote}</Notice>}

      {errors.length > 0 && <ErrorSummary ref={summaryRef} title={errorSummaryTitle} errors={errors} />}

      <div className="grid items-start gap-5 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-6">
        <SectionNav sections={sections} label={sectionsNavLabel} />
        <fieldset disabled={!canEdit} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
          {children}
        </fieldset>
      </div>

      <UnsavedChangesDialog
        open={guard.open}
        itemTitle={title}
        onStay={guard.stay}
        onDiscard={() => {
          editor.discard();
          guard.leave();
        }}
        onSaveAndLeave={async () => {
          if (await editor.submit()) guard.leave();
          else guard.stay();
        }}
      />
    </AdminPage>
  );
}

/** Sticky sub-nav (desktop) / scrolling chips (mobile); the section in view is marked. */
function SectionNav({
  sections,
  label,
}: {
  sections: readonly { id: string; label: string }[];
  label: string;
}) {
  const [active, setActive] = React.useState(sections[0]?.id ?? '');

  // The section being read: the last one whose top has passed under the sticky header.
  React.useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let current = sections[0]?.id ?? '';
        for (const section of sections) {
          const top = document.getElementById(section.id)?.getBoundingClientRect().top ?? Infinity;
          if (top <= 200) current = section.id;
        }
        // At the very bottom, the last sections may never reach the top: mark the last one.
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        setActive(atBottom ? (sections.at(-1)?.id ?? current) : current);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [sections]);

  return (
    <nav
      aria-label={label}
      className="-mx-4 overflow-x-auto px-4 lg:sticky lg:top-40 lg:mx-0 lg:overflow-visible lg:px-0"
    >
      <ul className="flex gap-1 lg:flex-col lg:gap-0.5">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={active === section.id ? 'true' : undefined}
              onClick={() => setActive(section.id)}
              className={cn(
                'flex h-9 items-center rounded-sm px-3 text-small whitespace-nowrap no-underline',
                'focus-visible:outline-2 focus-visible:outline-brand',
                active === section.id
                  ? 'bg-white font-bold text-ink shadow-[0_0_0_1px_var(--color-line)]'
                  : 'text-ink-2 hover:bg-divider',
              )}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
