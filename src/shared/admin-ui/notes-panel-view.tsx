'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import type { ActionResult } from '@/shared/forms/action-result';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';

export type NoteView = {
  id: string;
  authorName: string;
  initials: string;
  /** "18:05", "Yesterday, 18:05": already formatted on the server. */
  when: string;
  body: string;
};

type NotesPanelViewProps = {
  notes: NoteView[];
  /** What the notes belong to; handed to `action` with the text. */
  entity: { type: string; id: string };
  /** The Server Action that stores a note (and refreshes the page). */
  action: (input: { entityType: string; entityId: string; body: string }) => Promise<ActionResult<unknown>>;
  canAdd: boolean;
  maxLength: number;
};

/** "Internal notes · only admins see these" with the add field (AdminInbox, NotesPanelView). */
export function NotesPanelView({ notes, entity, action, canAdd, maxLength }: NotesPanelViewProps) {
  const t = useTranslations('admin.inbox.notes');
  const [body, setBody] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const inputId = React.useId();
  const errorId = `${inputId}-error`;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) {
      setError(t('errors.required'));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await action({ entityType: entity.type, entityId: entity.id, body }).catch(() => null);
      if (result?.ok) {
        setBody('');
        return;
      }
      setError(
        result && !result.ok && result.error === 'forbidden' ? t('errors.forbidden') : t('errors.unexpected'),
      );
    });
  }

  return (
    <section
      aria-labelledby={`${inputId}-title`}
      className="flex flex-col gap-3 border-t border-divider bg-surface-2 px-4 py-4.5 md:px-6"
    >
      <h3
        id={`${inputId}-title`}
        className="text-[13px] font-bold tracking-[0.05em] text-muted-ink uppercase"
      >
        {t('title')}
      </h3>
      {notes.length === 0 ? (
        <p className="text-[13px] text-muted-ink">{t('empty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {notes.map((note) => (
            <li key={note.id} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2.5">
              <span
                aria-hidden
                className="flex size-7 items-center justify-center rounded-full bg-divider text-[11px] font-bold"
              >
                {note.initials}
              </span>
              <span className="text-[13px] leading-normal">
                <strong>{note.authorName}</strong> <span className="text-muted-ink">· {note.when}</span>
                <br />
                <span className="break-words whitespace-pre-wrap">{note.body}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {canAdd && (
        <form noValidate onSubmit={submit} className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">{t('label')}</span>
              <Input
                id={inputId}
                value={body}
                maxLength={maxLength}
                placeholder={t('placeholder')}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                disabled={pending}
                onChange={(event) => setBody(event.target.value)}
              />
            </label>
            <Button type="submit" variant="quiet" disabled={pending}>
              {t('add')}
            </Button>
          </div>
          {error && (
            <p id={errorId} role="alert" className="text-small font-medium text-brand-dark">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
