'use client';

import { ArrowLeft, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { AdminPage, AdminPageHeader, CountPill } from '@/shared/admin-ui/admin-page';
import { RowActions } from '@/shared/admin-ui/data-table';
import { AdminDialog } from '@/shared/admin-ui/dialogs';
import { LocalizedField } from '@/shared/admin-ui/localized-field';
import { SortableList } from '@/shared/admin-ui/sortable-list';
import type { FieldErrors } from '@/shared/forms/action-result';
import type { Localized } from '@/shared/types/localized';
import { FormField } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/primitives/dropdown-menu';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/primitives/native-select';

import {
  createTaxonomyItem,
  removeTaxonomyItem,
  renameTaxonomyItem,
  reorderTaxonomy,
} from '../../actions/event-taxonomy';
import type { TaxonomyKind } from '../../data/events.repository';
import type { EventTopic, EventType, TaxonomyUsage } from '../../types';

type Item = TaxonomyUsage<EventType | EventTopic>;

type EditorProps = { types: Item[]; topics: Item[] };

/**
 * /admin/events/types: the event types (one per event, the public filters) and topics (any per
 * event). Not on the canvas: built from the Settings › Board roles pattern (sortable rows).
 */
export function EventTaxonomyEditor({ types, topics }: EditorProps) {
  const t = useTranslations('admin.events.taxonomy');
  return (
    <AdminPage>
      <Link
        href="/admin/events"
        className="-mb-2 flex w-fit items-center gap-1.5 text-small text-muted-ink no-underline hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('back')}
      </Link>
      <AdminPageHeader title={t('title')} description={t('description')} />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <TaxonomyPanel kind="types" items={types} />
        <TaxonomyPanel kind="topics" items={topics} />
      </div>
    </AdminPage>
  );
}

type Dialog = { mode: 'add' } | { mode: 'rename'; item: Item } | { mode: 'remove'; item: Item } | null;

function TaxonomyPanel({ kind, items: serverItems }: { kind: TaxonomyKind; items: Item[] }) {
  const t = useTranslations('admin.events.taxonomy');
  const tTable = useTranslations('admin.ui.table');
  // Optimistic order while a reorder is saved; the server list wins on the next render.
  const [ordered, setOrdered] = React.useState<{ source: Item[]; items: Item[] }>({
    source: serverItems,
    items: serverItems,
  });
  const items = ordered.source === serverItems ? ordered.items : serverItems;
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const titleId = `${kind}-title`;

  const reorder = async (next: Item[]) => {
    setOrdered({ source: serverItems, items: next });
    const result = await reorderTaxonomy({ kind, ids: next.map((item) => item.id) });
    if (result.ok) toast.success(t('toasts.reordered'));
    else {
      setOrdered({ source: serverItems, items: serverItems });
      toast.error(t(result.error === 'conflict' ? 'toasts.conflict' : 'errors.unexpected'));
    }
  };

  return (
    <section aria-labelledby={titleId} className="overflow-hidden rounded-md border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-4 py-3.5 md:px-5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={titleId} className="flex items-center gap-2 text-[16px] font-bold">
            {t(kind)}
            <CountPill>{items.length}</CountPill>
          </h2>
          <p className="text-[13px] text-muted-ink">{t(`${kind}Help`)}</p>
        </div>
        <Button variant="quiet" size="sm" onClick={() => setDialog({ mode: 'add' })}>
          <Plus aria-hidden />
          {t(`add.${kind}`)}
        </Button>
      </div>
      <SortableList
        items={items}
        onReorder={(next) => void reorder(next)}
        label={t(kind)}
        itemName={(item) => item.name.mk}
        renderItem={(item, handle) => (
          <div className="flex min-h-14 items-center gap-2 border-b border-divider px-3 py-2 md:px-4">
            {handle}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{item.name.mk}</span>
              {item.name.en && item.name.en !== item.name.mk && (
                <span lang="en" className="truncate text-[13px] text-muted-ink">
                  {item.name.en}
                </span>
              )}
            </span>
            <span className="shrink-0 text-[13px] whitespace-nowrap text-muted-ink">
              {t('usage', { count: item.eventCount })}
            </span>
            <RowActions label={tTable('moreActions', { label: item.name.mk })}>
              <DropdownMenuItem onSelect={() => setDialog({ mode: 'rename', item })}>
                <Pencil aria-hidden />
                {t('rename')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDialog({ mode: 'remove', item })}>
                <Trash2 aria-hidden />
                {t('remove')}
              </DropdownMenuItem>
            </RowActions>
          </div>
        )}
      />

      <NameDialog
        kind={kind}
        item={dialog?.mode === 'rename' ? dialog.item : null}
        open={dialog?.mode === 'add' || dialog?.mode === 'rename'}
        onClose={() => setDialog(null)}
      />
      <RemoveDialog
        kind={kind}
        item={dialog?.mode === 'remove' ? dialog.item : null}
        others={items.filter((other) => dialog?.mode === 'remove' && other.id !== dialog.item.id)}
        onClose={() => setDialog(null)}
      />
    </section>
  );
}

const errorKey = (errors: FieldErrors, path: string) => {
  const key = errors[path]?.[0];
  if (!key) return undefined;
  return ['required', 'tooLong', 'duplicate', 'replacementRequired'].includes(key) ? key : 'unexpected';
};

function NameDialog({
  kind,
  item,
  open,
  onClose,
}: {
  kind: TaxonomyKind;
  item: Item | null;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('admin.events.taxonomy');
  const tDialogs = useTranslations('admin.ui.dialogs');
  const [name, setName] = React.useState<Localized>({ mk: '' });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [pending, startTransition] = React.useTransition();
  const formId = React.useId();

  // Start from the item's name each time the dialog opens.
  const [lastOpen, setLastOpen] = React.useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(item ? item.name : { mk: '' });
      setErrors({});
    }
  }

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = item
        ? await renameTaxonomyItem({ kind, id: item.id, name })
        : await createTaxonomyItem({ kind, name });
      if (result.ok) {
        toast.success(t(item ? 'toasts.renamed' : 'toasts.added'));
        onClose();
      } else if (result.error === 'validation') setErrors(result.fieldErrors);
      else toast.error(t('errors.unexpected'));
    });
  };
  const mkError = errorKey(errors, 'name.mk') ?? errorKey(errors, 'name.en');

  return (
    <AdminDialog
      open={open}
      onOpenChange={(next) => !next && !pending && onClose()}
      title={item ? t(`renameTitle.${kind}`) : t(`addTitle.${kind}`)}
      footer={
        <>
          <Button variant="quiet" size="sm" onClick={onClose} disabled={pending}>
            {tDialogs('cancel')}
          </Button>
          <Button type="submit" form={formId} size="sm" disabled={pending} aria-busy={pending || undefined}>
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
      <form id={formId} onSubmit={save} noValidate>
        <LocalizedField
          id={`${formId}-name`}
          label={t('name')}
          required
          value={name}
          onChange={setName}
          error={mkError && t(`errors.${mkError as 'required'}`)}
        />
      </form>
    </AdminDialog>
  );
}

function RemoveDialog({
  kind,
  item,
  others,
  onClose,
}: {
  kind: TaxonomyKind;
  item: Item | null;
  others: Item[];
  onClose: () => void;
}) {
  const t = useTranslations('admin.events.taxonomy');
  const tDialogs = useTranslations('admin.ui.dialogs');
  const [replacementId, setReplacementId] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const id = React.useId();

  const open = item !== null;
  const [lastItem, setLastItem] = React.useState(item);
  if (item !== lastItem) {
    setLastItem(item);
    setReplacementId('');
    setError(undefined);
  }

  const isType = kind === 'types';
  const used = item?.eventCount ?? 0;
  const lastType = isType && others.length === 0;
  const needsReplacement = isType && used > 0;

  const remove = () =>
    startTransition(async () => {
      if (!item) return;
      if (needsReplacement && !replacementId) {
        setError(t('errors.replacementRequired'));
        return;
      }
      const result = await removeTaxonomyItem({
        kind,
        id: item.id,
        replacementId: needsReplacement ? replacementId : undefined,
      });
      if (result.ok) {
        toast.success(t('toasts.removed'));
        onClose();
      } else if (result.error === 'validation') setError(t('errors.replacementRequired'));
      else toast.error(t('errors.unexpected'));
    });

  return (
    <AdminDialog
      open={open}
      onOpenChange={(next) => !next && !pending && onClose()}
      role="alertdialog"
      icon="danger"
      initialFocus={cancelRef}
      title={item ? t('removeTitle', { name: item.name.mk }) : ''}
      description={
        lastType
          ? t('lastType')
          : isType
            ? used > 0
              ? t('removeTypeUsed', { count: used })
              : t('removeTypeUnused')
            : t('removeTopicText', { count: used })
      }
      footer={
        <>
          <Button ref={cancelRef} variant="quiet" size="sm" onClick={onClose} disabled={pending}>
            {tDialogs('cancel')}
          </Button>
          {!lastType && (
            <Button
              variant="danger"
              size="sm"
              onClick={remove}
              disabled={pending}
              aria-busy={pending || undefined}
            >
              {pending ? t('removing') : t('removeConfirm')}
            </Button>
          )}
        </>
      }
    >
      {needsReplacement && !lastType && (
        <FormField id={`${id}-replacement`} label={t('replacement')} required error={error}>
          {(control) => (
            <NativeSelect
              {...control}
              value={replacementId}
              onChange={(event) => {
                setReplacementId(event.target.value);
                setError(undefined);
              }}
              className="[&_select]:md:text-small"
            >
              <NativeSelectOption value="">{t('replacementPick')}</NativeSelectOption>
              {others.map((other) => (
                <NativeSelectOption key={other.id} value={other.id}>
                  {other.name.mk}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
      )}
    </AdminDialog>
  );
}
