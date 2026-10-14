'use client';

import { Plus, Trash2 } from 'lucide-react';

import type { Localized } from '@/shared/types/localized';
import { FieldError } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';

import { LocalizedField } from './localized-field';
import { SortableList } from './sortable-list';
import { useFocusAdded } from './use-focus-added';

export type LocalizedListItem = { id: string; text: Localized };

type Props = {
  /** Visible label of the whole list ("Who can join: requirements"). */
  label: string;
  items: LocalizedListItem[];
  onChange: (items: LocalizedListItem[]) => void;
  /** Id of the text field of row `index` (the error summary links to it). */
  fieldId: (index: number) => string;
  /** Translated error of the Macedonian text of row `index`. */
  error?: (index: number) => string | undefined;
  /** Error of the list itself (too many). */
  listError?: string;
  maxItems: number;
  maxLength: number;
  multiline?: boolean;
  /** Words, already translated. */
  text: {
    /** "Requirement 2" */
    item: (number: number) => string;
    add: string;
    remove: (number: number) => string;
    empty: string;
    full: string;
  };
  newId: () => string;
};

/**
 * A short list of board-written lines in both languages (requirements, rights, obligations, form
 * options): drag or keyboard reorder, add (focus goes to the new line), remove.
 */
export function LocalizedListField({
  label,
  items,
  onChange,
  fieldId,
  error,
  listError,
  maxItems,
  maxLength,
  multiline,
  text,
  newId,
}: Props) {
  const focusAdded = useFocusAdded(items.length);
  const full = items.length >= maxItems;
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-small font-medium">{label}</span>
      {items.length === 0 && <p className="text-small text-muted-ink">{text.empty}</p>}
      <SortableList
        label={label}
        items={items}
        itemName={(item) => item.text.en?.trim() || item.text.mk.trim() || text.item(items.indexOf(item) + 1)}
        onReorder={onChange}
        className="flex flex-col gap-2.5"
        renderItem={(item, handle) => {
          const index = items.findIndex((candidate) => candidate.id === item.id);
          return (
            <div className="grid grid-cols-[32px_minmax(0,1fr)_36px] items-start gap-2">
              <span className="mt-6 flex h-(--control-h) items-start">{handle}</span>
              <LocalizedField
                id={fieldId(index)}
                label={text.item(index + 1)}
                required
                multiline={multiline}
                rows={2}
                value={item.text}
                onChange={(value) =>
                  onChange(items.map((row) => (row.id === item.id ? { ...row, text: value } : row)))
                }
                error={error?.(index)}
                maxLength={maxLength}
              />
              <Button
                variant="ghost"
                size="icon"
                className="mt-6 size-9 text-muted-ink"
                aria-label={text.remove(index + 1)}
                onClick={() => onChange(items.filter((row) => row.id !== item.id))}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          );
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="quiet"
          size="sm"
          disabled={full}
          onClick={() => {
            focusAdded(fieldId(items.length));
            onChange([...items, { id: newId(), text: { mk: '' } }]);
          }}
        >
          <Plus aria-hidden />
          {text.add}
        </Button>
        {full && <span className="text-[13px] text-muted-ink">{text.full}</span>}
      </div>
      {listError && <FieldError>{listError}</FieldError>}
    </div>
  );
}
