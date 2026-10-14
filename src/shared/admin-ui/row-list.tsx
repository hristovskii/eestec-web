'use client';

import { Plus, Trash2 } from 'lucide-react';
import * as React from 'react';

import { FieldError } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';

import { SortableList } from './sortable-list';

/** A reorderable list of rows; `fields` draws the inside of one row. */
export function RowList<T extends { id: string }>({
  label,
  items,
  onReorder,
  itemName,
  fields,
  onRemove,
  removeLabel,
}: {
  label: string;
  items: T[];
  onReorder: (items: T[]) => void;
  itemName: (item: T) => string;
  fields: (item: T, index: number) => React.ReactNode;
  onRemove: (index: number) => void;
  removeLabel: (name: string) => string;
}) {
  return (
    <SortableList
      label={label}
      items={items}
      itemName={itemName}
      onReorder={onReorder}
      className="flex flex-col gap-3"
      renderItem={(item, handle) => {
        const index = items.findIndex((candidate) => candidate.id === item.id);
        return (
          <div className="grid grid-cols-[32px_minmax(0,1fr)_36px] items-start gap-2 rounded-md border border-line p-3">
            <span className="flex h-(--control-h) items-center">{handle}</span>
            <div className="flex min-w-0 flex-col gap-3">{fields(item, index)}</div>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 text-muted-ink"
              aria-label={removeLabel(itemName(item))}
              onClick={() => onRemove(index)}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        );
      }}
    />
  );
}

export function AddRow({
  label,
  onAdd,
  full,
  fullText,
  error,
}: {
  label: string;
  onAdd: () => void;
  full: boolean;
  fullText: string;
  error?: string;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="quiet" size="sm" disabled={full} onClick={onAdd}>
          <Plus aria-hidden />
          {label}
        </Button>
        {full && <span className="text-[13px] text-muted-ink">{fullText}</span>}
      </div>
      {error && <FieldError>{error}</FieldError>}
    </>
  );
}
