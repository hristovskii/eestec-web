'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { ConfirmDeleteDialog, RejectDialog, UnsavedChangesDialog } from '@/shared/admin-ui/dialogs';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import { SaveBar } from '@/shared/admin-ui/save-bar';
import { useUnsavedChanges } from '@/shared/forms/use-unsaved-changes';
import { formatDate } from '@/shared/i18n/format';
import type { Localized } from '@/shared/types/localized';
import { useClockNow } from '@/shared/ui/clock-provider';
import { ErrorSummary, type FieldErrorItem } from '@/shared/ui/form/error-summary';
import { FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { ToastCheck } from '@/shared/ui/primitives/sonner';
import { Textarea } from '@/shared/ui/primitives/textarea';

const noop = () => undefined;
const draft = { label: 'Draft', tone: 'outline' } as const;
const live = { label: 'Published', tone: 'dark' } as const;

/** The four save bar states of AdminEditStates, side by side. */
export function SaveBarStates({ savedAt }: { savedAt: string }) {
  const bar = {
    title: 'Workshop: AI at the Edge',
    onPreview: noop,
    onSaveDraft: noop,
    onPublish: noop,
    onDiscard: noop,
  };
  return (
    <div className="flex flex-col gap-3">
      {(
        [
          ['1 · No changes', { status: draft, state: 'clean', published: false, savedAt }],
          ['2 · Unsaved changes', { status: draft, state: 'dirty', published: false }],
          ['3 · Saving', { status: draft, state: 'saving', published: false }],
          ['4 · Published, then edited', { status: live, state: 'dirty', published: true }],
        ] as const
      ).map(([label, props]) => (
        <div key={label} className="flex flex-col gap-2">
          <span className="text-[12px] font-bold tracking-[0.06em] uppercase">{label}</span>
          <SaveBar {...bar} {...props} className="static" />
        </div>
      ))}
    </div>
  );
}

type Values = { title: Localized; start: string; end: string; alt: string };

const validate = (values: Values) => {
  const fields: Partial<Record<'title' | 'end' | 'alt', string>> = {};
  const summary: FieldErrorItem[] = [];
  if (!values.title.mk.trim()) {
    fields.title = 'Add a title';
    summary.push({ fieldId: 'demo-title', label: 'Title', message: 'is empty' });
  }
  if (values.start && values.end && values.end < values.start) {
    fields.end = `Must be on or after ${formatDate(values.start, 'en', 'date')}`;
    summary.push({ fieldId: 'demo-end', label: 'End date', message: 'is before the start date' });
  }
  if (!values.alt.trim()) {
    fields.alt = "Describe the photo for people who can't see it";
    summary.push({ fieldId: 'demo-alt', label: 'Cover image', message: 'needs alt text' });
  }
  return { fields, summary };
};

/**
 * A live edit form: sticky save bar, MK/EN field, "Save draft" always works, "Publish" lists what's
 * missing, toasts, and the leave-without-saving dialog for sidebar links while there are changes.
 */
export function EditFormDemo({ savedAt: initialSavedAt }: { savedAt: string }) {
  const clockNow = useClockNow();
  const initial: Values = {
    title: { mk: 'Workshop: AI at the Edge' },
    start: '2026-11-07',
    end: '2026-11-06',
    alt: '',
  };
  const [values, setValues] = React.useState(initial);
  const [saved, setSaved] = React.useState(initial);
  const [published, setPublished] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<Date | string>(initialSavedAt);
  const [errors, setErrors] = React.useState<ReturnType<typeof validate> | null>(null);
  const [pending, startTransition] = React.useTransition();
  const summaryRef = React.useRef<HTMLDivElement>(null);

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const guard = useUnsavedChanges(dirty);
  const set = (patch: Partial<Values>) => setValues((v) => ({ ...v, ...patch }));

  const save = (then?: () => void) =>
    new Promise<void>((resolve) =>
      startTransition(async () => {
        await new Promise((r) => setTimeout(r, 700));
        setSaved(values);
        setSavedAt(clockNow());
        then?.();
        resolve();
      }),
    );

  const saveDraft = () =>
    save(() =>
      toast.success('Saved as draft', {
        action: { label: 'Undo', onClick: () => toast('Sample data: nothing to undo.') },
      }),
    );

  const publish = () => {
    const result = validate(values);
    if (result.summary.length > 0) {
      setErrors(result);
      // Next frame: the summary is rendered.
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setErrors(null);
    void save(() => {
      setPublished(true);
      toast.success("Published. It's live on eestec.mk.", {
        icon: <ToastCheck live />,
        action: { label: 'View ↗', onClick: () => window.open('/', '_blank') },
      });
    });
  };

  const fieldErrors = errors?.fields ?? {};

  return (
    <div className="flex flex-col gap-4">
      <SaveBar
        title={saved.title.mk || 'Untitled event'}
        status={published ? live : draft}
        state={pending ? 'saving' : dirty ? 'dirty' : 'clean'}
        published={published}
        savedAt={savedAt}
        onPreview={() => toast('Preview opens the public page with this draft (M5).')}
        onSaveDraft={() => void saveDraft()}
        onPublish={publish}
        onDiscard={() => {
          setValues(saved);
          setErrors(null);
        }}
      />
      <div className="flex flex-col gap-4.5 rounded-md border border-line bg-white p-5">
        {errors && errors.summary.length > 0 && (
          <ErrorSummary
            ref={summaryRef}
            title={`Can't publish yet: fix ${errors.summary.length} field${errors.summary.length === 1 ? '' : 's'}`}
            errors={errors.summary}
          />
        )}
        <LocalizedField
          id="demo-title"
          label="Title"
          required
          value={values.title}
          onChange={(title) => set({ title })}
          error={fieldErrors.title}
          placeholder="e.g. Workshop: AI at the Edge"
        />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <FormField id="demo-start" label="Start date" required>
            {(control) => (
              <Input
                {...control}
                type="date"
                value={values.start}
                onChange={(e) => set({ start: e.target.value })}
              />
            )}
          </FormField>
          <FormField id="demo-end" label="End date" required error={fieldErrors.end}>
            {(control) => (
              <Input
                {...control}
                type="date"
                value={values.end}
                onChange={(e) => set({ end: e.target.value })}
              />
            )}
          </FormField>
        </div>
        <FormField id="demo-alt" label="Cover image alt text" required error={fieldErrors.alt}>
          {(control) => (
            <Textarea
              {...control}
              rows={2}
              value={values.alt}
              onChange={(e) => set({ alt: e.target.value })}
              className="min-h-0 md:text-small"
            />
          )}
        </FormField>
      </div>
      <UnsavedChangesDialog
        open={guard.open}
        itemTitle={saved.title.mk || undefined}
        onStay={guard.stay}
        onDiscard={() => {
          setValues(saved);
          guard.leave();
        }}
        onSaveAndLeave={async () => {
          await save();
          guard.leave();
        }}
      />
    </div>
  );
}

/** Buttons that open each dialog of AdminDialogs with the canvas copy. */
export function DialogsDemo() {
  const [open, setOpen] = React.useState<'delete' | 'reject' | 'leave' | null>(null);
  const close = () => setOpen(null);
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="dangerOutline" size="sm" onClick={() => setOpen('delete')}>
        Delete confirmation
      </Button>
      <Button variant="quiet" size="sm" onClick={() => setOpen('reject')}>
        Reject with a reason
      </Button>
      <Button variant="quiet" size="sm" onClick={() => setOpen('leave')}>
        Leaving with unsaved changes
      </Button>

      <ConfirmDeleteDialog
        open={open === 'delete'}
        onOpenChange={(next) => !next && close()}
        title="Delete “Workshop: AI at the Edge”?"
        description={
          <>
            This also deletes its gallery (8 photos) and <strong className="text-ink">38 applications</strong>
            . This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete event"
        onConfirm={async () => {
          await new Promise((r) => setTimeout(r, 600));
          close();
          toast('Sample data: nothing was deleted.');
        }}
      >
        <a href="#export" className="w-fit text-small font-medium text-brand-dark underline">
          Export the 38 applications first (CSV)
        </a>
      </ConfirmDeleteDialog>
      <RejectDialog
        open={open === 'reject'}
        onOpenChange={(next) => !next && close()}
        title="Reject this Memory?"
        description="“Seven days, 28 nationalities…” by Marija Stojanovska"
        presets={['Photos need alt text', 'Not about an EESTEC event', 'Needs shorter text']}
        onReject={async ({ presets, notify }) => {
          await new Promise((r) => setTimeout(r, 600));
          close();
          toast(`Rejected (${presets.length} quick reasons, e-mail ${notify ? 'on' : 'off'}). Sample data.`);
        }}
      />
      <UnsavedChangesDialog
        open={open === 'leave'}
        itemTitle="Workshop: AI at the Edge"
        onStay={close}
        onDiscard={close}
        onSaveAndLeave={close}
      />
    </div>
  );
}

/** The three toasts of AdminEditStates. */
export function ToastsDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="quiet"
        size="sm"
        onClick={() => toast.success('Saved as draft', { action: { label: 'Undo', onClick: noop } })}
      >
        Saved
      </Button>
      <Button
        variant="quiet"
        size="sm"
        onClick={() =>
          toast.success("Published. It's live on eestec.mk.", {
            icon: <ToastCheck live />,
            action: { label: 'View ↗', onClick: () => window.open('/', '_blank') },
          })
        }
      >
        Published
      </Button>
      <Button
        variant="quiet"
        size="sm"
        onClick={() =>
          toast.error("Couldn't save", {
            description: 'Check your connection. Your changes are kept on this device.',
            duration: Infinity,
            action: { label: 'Retry', onClick: noop },
          })
        }
      >
        Error (stays until closed)
      </Button>
    </div>
  );
}
