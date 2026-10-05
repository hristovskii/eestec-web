'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

type SortableListProps<T extends { id: string }> = {
  items: T[];
  onReorder: (items: T[]) => void;
  /** Accessible name of the list. */
  label: string;
  /** Short name of an item for the handle and announcements ("Chairperson"). */
  itemName: (item: T) => string;
  /** One row; `handle` is the drag handle to place in it. */
  renderItem: (item: T, handle: React.ReactNode) => React.ReactNode;
  /** grid: tiles that move in both directions (photo galleries); `className` sets the columns. */
  layout?: 'list' | 'grid';
  className?: string;
};

/**
 * A list reordered by dragging a handle (AdminSettings › Board roles), with the mouse, touch or the
 * keyboard (Space, arrows, Space). Screen readers hear every move.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  label,
  itemName,
  renderItem,
  layout = 'list',
  className,
}: SortableListProps<T>) {
  const t = useTranslations('admin.ui.sortable');
  // A stable id keeps the server and client markup the same (dnd-kit adds aria-describedby).
  const id = React.useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const nameOf = (itemId: UniqueIdentifier) => {
    const item = items.find((candidate) => candidate.id === itemId);
    return item ? itemName(item) : '';
  };
  const positionOf = (itemId: UniqueIdentifier) => items.findIndex((item) => item.id === itemId) + 1;

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    onReorder(arrayMove(items, from, to));
  };

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={layout === 'list' ? [restrictToVerticalAxis] : []}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: { draggable: t('instructions') },
        announcements: {
          onDragStart: ({ active }) => t('picked', { name: nameOf(active.id) }),
          onDragOver: ({ active, over }) =>
            over
              ? t('over', { name: nameOf(active.id), position: positionOf(over.id), count: items.length })
              : '',
          onDragEnd: ({ active, over }) =>
            over
              ? t('dropped', { name: nameOf(active.id), position: positionOf(over.id), count: items.length })
              : '',
          onDragCancel: ({ active }) => t('cancelled', { name: nameOf(active.id) }),
        },
      }}
    >
      <SortableContext
        items={items}
        strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
      >
        <ul aria-label={label} className={cn('m-0 list-none p-0', className)}>
          {items.map((item) => (
            <SortableRow
              key={item.id}
              id={item.id}
              layout={layout}
              handleLabel={t('handle', { name: itemName(item) })}
            >
              {(handle) => renderItem(item, handle)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  layout,
  handleLabel,
  children,
}: {
  id: string;
  layout: 'list' | 'grid';
  handleLabel: string;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={handleLabel}
      className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-muted-ink hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-brand active:cursor-grabbing"
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  );
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'relative',
        layout === 'list' && 'bg-white',
        isDragging &&
          (layout === 'list'
            ? 'z-10 bg-surface-2 shadow-[inset_0_0_0_2px_var(--color-ink)]'
            : 'z-10 -rotate-2 drop-shadow-[0_14px_30px_rgb(0_0_0/0.22)]'),
      )}
    >
      {children(handle)}
    </li>
  );
}
