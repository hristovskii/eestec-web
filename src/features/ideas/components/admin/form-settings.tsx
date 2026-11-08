'use client';

import { Plus, Settings2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { LocalizedField } from '@/shared/admin-ui/localized-field';
import { SortableList } from '@/shared/admin-ui/sortable-list';
import { Button } from '@/shared/ui/primitives/button';
import { Label } from '@/shared/ui/primitives/label';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/primitives/sheet';
import { Switch } from '@/shared/ui/primitives/switch';
import type { Localized } from '@/shared/types/localized';
import { setNotificationEnabled } from '@/features/settings';

import { saveIdeaForm } from '../../actions/admin-ideas';
import type { IdeaFormSettings } from '../../types';

type TypeRow = { key: string; id: string; name: Localized };

const toRows = (types: IdeaFormSettings['types']): TypeRow[] =>
  types.map((type) => ({ key: type.id, id: type.id, name: { ...type.name } }));

/**
 * Admin › Ideas › Form settings (AdminIdeas-Settings): the line under each tab's title, the idea
 * types (add, rename, reorder, remove), and the board notification switch. Opens as a drawer.
 */
export function FormSettings({
  settings,
  notify,
}: {
  settings: IdeaFormSettings;
  /** The Settings › E-mail notifications switch for ideas; `canChange`: super admins only (D18). */
  notify: { enabled: boolean; canChange: boolean };
}) {
  const t = useTranslations('admin.ideas.settings');
  const [open, setOpen] = React.useState(false);
  const [intro, setIntro] = React.useState(settings.intro);
  const [types, setTypes] = React.useState<TypeRow[]>(() => toRows(settings.types));
  const [notifyOn, setNotifyOn] = React.useState(notify.enabled);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, startTransition] = React.useTransition();
  const notifyId = React.useId();

  function reset(next: boolean) {
    setOpen(next);
    if (next) {
      setIntro(settings.intro);
      setTypes(toRows(settings.types));
      setNotifyOn(notify.enabled);
      setErrors({});
    }
  }

  const errorText = (key: string | undefined, name?: string) =>
    key ? t(`errors.${key}` as 'errors.required', { name: name ?? '' }) : undefined;

  function save() {
    startTransition(async () => {
      const result = await saveIdeaForm({
        intro,
        types: types.map((type) => ({ id: type.id, name: type.name })),
      }).catch(() => null);
      if (!result?.ok) {
        if (result && !result.ok && result.error === 'validation') {
          const next: Record<string, string> = {};
          for (const [path, keys] of Object.entries(result.fieldErrors))
            next[path] = errorText(keys[0]) ?? '';
          setErrors(next);
        } else if (result && !result.ok && result.error === 'conflict')
          setErrors({ types: errorText('inUse', result.message) ?? '' });
        else toast.error(t('error'));
        return;
      }
      if (notify.canChange && notifyOn !== notify.enabled) {
        const change = await setNotificationEnabled({ kind: 'ideasAndFeedback', enabled: notifyOn }).catch(
          () => null,
        );
        if (!change?.ok) {
          toast.error(t('error'));
          return;
        }
      }
      toast.success(t('saved'));
      setOpen(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={reset}>
      <SheetTrigger asChild>
        <Button variant="quiet">
          <Settings2 aria-hidden />
          {t('open')}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[520px] max-w-[95vw] gap-0 p-0">
        <SheetHeader className="border-b border-divider px-5.5 py-5 pr-16">
          <SheetTitle className="text-[18px] font-bold">{t('title')}</SheetTitle>
          <SheetDescription className="text-small text-muted-ink">{t('description')}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5.5 py-5">
          <LocalizedField
            id="fs-intro-idea"
            label={t('introIdea')}
            required
            multiline
            rows={3}
            maxLength={300}
            value={intro.idea}
            onChange={(idea) => setIntro({ ...intro, idea })}
            error={errors['intro.idea.mk']}
          />
          <LocalizedField
            id="fs-intro-impression"
            label={t('introImpression')}
            required
            multiline
            rows={3}
            maxLength={300}
            value={intro.impression}
            onChange={(impression) => setIntro({ ...intro, impression })}
            error={errors['intro.impression.mk']}
          />
          <section aria-labelledby="fs-types" className="flex flex-col gap-3">
            <h3 id="fs-types" className="text-small font-medium">
              {t('types')}
            </h3>
            <SortableList
              items={types}
              onReorder={(next) => setTypes(next)}
              label={t('typeSort')}
              itemName={(item) => item.name.en || item.name.mk || t('typeName', { n: 1 })}
              renderItem={(item, handle) => {
                const index = types.findIndex((candidate) => candidate.key === item.key);
                return (
                  <div className="flex items-end gap-2 rounded-md border border-line bg-white p-2.5">
                    {handle}
                    <div className="min-w-0 flex-1">
                      <LocalizedField
                        id={`fs-type-${item.key}`}
                        label={t('typeName', { n: index + 1 })}
                        required
                        maxLength={60}
                        value={item.name}
                        onChange={(name) =>
                          setTypes((current) =>
                            current.map((type) => (type.key === item.key ? { ...type, name } : type)),
                          )
                        }
                        error={errors[`types.${index}.name.mk`]}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('removeType', {
                        name: item.name.en || item.name.mk || String(index + 1),
                      })}
                      disabled={types.length <= 1}
                      onClick={() => setTypes((current) => current.filter((type) => type.key !== item.key))}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                );
              }}
            />
            {(errors.types ?? errors.noTypes) && (
              <p role="alert" className="text-small font-medium text-brand-dark">
                {errors.types}
              </p>
            )}
            <Button
              variant="quiet"
              className="self-start"
              disabled={types.length >= 12}
              onClick={() =>
                setTypes((current) => [
                  ...current,
                  { key: `new-${crypto.randomUUID()}`, id: '', name: { mk: '' } },
                ])
              }
            >
              <Plus aria-hidden />
              {t('addType')}
            </Button>
          </section>
          <div className="flex items-start justify-between gap-4 rounded-md bg-surface px-4 py-3.5">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor={notifyId} className="text-small font-medium">
                {t('notify')}
              </Label>
              <span className="text-small text-muted-ink">
                {notify.canChange ? t('notifyHelp') : t('notifyLocked')}
              </span>
            </div>
            <Switch
              id={notifyId}
              size="sm"
              checked={notifyOn}
              disabled={!notify.canChange}
              onCheckedChange={setNotifyOn}
            />
          </div>
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t border-divider px-5.5 py-4">
          <SheetClose asChild>
            <Button variant="quiet">{t('cancel')}</Button>
          </SheetClose>
          <Button onClick={save} disabled={pending}>
            {pending ? t('saving') : t('save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
