'use client';

import Image from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extensions';
import { EditorContent, type Editor, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  type LucideIcon,
  Quote,
  Redo2,
  Undo2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import type { Locale } from '@/shared/i18n/routing';
import { cn } from '@/shared/lib/cn';
import { countWords, isEmptyRichText } from '@/shared/lib/rich-text';
import type { Localized } from '@/shared/types/localized';
import { FieldError } from '@/shared/ui/form/form-field';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';

import { LanguageToggle } from './localized-field';

// RichTextEditor (AdminEventEdit › Description): Tiptap with the canvas toolbar. Output is HTML
// limited to what the toolbar makes; the server sanitizes it again on save (shared/lib/sanitize-html).

/** An image to insert: the feature opens its Media library picker and calls back. */
export type PickImage = (insert: (image: { src: string; alt: string }) => void) => void;

/** The text inside the editor, styled like the public pages' rich text (`.rte`). */
export const richTextClasses = cn(
  'text-[15px] leading-[1.65] text-ink',
  '[&_h2]:mb-2 [&_h2]:text-[20px] [&_h2]:leading-tight [&_h2]:font-bold',
  '[&_h3]:mb-2 [&_h3]:text-[18px] [&_h3]:leading-tight [&_h3]:font-bold',
  '[&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5.5 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5.5',
  '[&_a]:text-brand-dark [&_a]:underline [&_li_p]:mb-0',
  '[&_blockquote]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:border-line-strong [&_blockquote]:pl-4 [&_blockquote]:text-ink-2',
  '[&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-sm',
  '[&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-muted-ink [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
);

type RichTextEditorProps = {
  id: string;
  /** Accessible name (the visible label lives outside, see LocalizedRichTextField). */
  labelledBy: string;
  describedBy?: string;
  value: string;
  onChange: (html: string) => void;
  lang?: Locale;
  placeholder?: string;
  invalid?: boolean;
  pickImage?: PickImage;
  minHeight?: number;
};

export function RichTextEditor({
  id,
  labelledBy,
  describedBy,
  value,
  onChange,
  lang,
  placeholder,
  invalid,
  pickImage,
  minHeight = 220,
}: RichTextEditorProps) {
  const t = useTranslations('admin.ui.richText');
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  });

  const editor = useEditor({
    // Rendered on the client only (no SSR mismatch); the page shows the panel meanwhile.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: value,
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': labelledBy,
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        ...(invalid ? { 'aria-invalid': 'true' } : {}),
        ...(lang ? { lang } : {}),
        class: cn('px-5 py-4.5 outline-none', richTextClasses),
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      onChangeRef.current(isEmptyRichText(html) ? '' : html);
    },
  });

  // Discard / reset from outside: load the new value when it differs from the editor's.
  React.useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const normalized = isEmptyRichText(current) ? '' : current;
    if (normalized !== value) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-sm border bg-white',
        'has-[[contenteditable]:focus]:border-brand has-[[contenteditable]:focus]:ring-3 has-[[contenteditable]:focus]:ring-brand/25',
        invalid ? 'border-2 border-brand' : 'border-line-input',
      )}
    >
      <Toolbar editor={editor} pickImage={pickImage} />
      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div aria-hidden className={cn('px-5 py-4.5', richTextClasses)} style={{ minHeight }} />
      )}
      <div className="flex justify-between gap-3 border-t border-divider bg-surface-2 px-3.5 py-2 text-[13px] text-muted-ink">
        <span>{t('pasteHint')}</span>
        <span className="shrink-0 tabular-nums">{t('words', { count: countWords(value) })}</span>
      </div>
    </div>
  );
}

function Toolbar({ editor, pickImage }: { editor: Editor | null; pickImage?: PickImage }) {
  const t = useTranslations('admin.ui.richText');
  const [linking, setLinking] = React.useState<string | null>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            block: e.isActive('heading', { level: 2 })
              ? 'h2'
              : e.isActive('heading', { level: 3 })
                ? 'h3'
                : 'p',
            bold: e.isActive('bold'),
            italic: e.isActive('italic'),
            link: e.isActive('link'),
            bulletList: e.isActive('bulletList'),
            orderedList: e.isActive('orderedList'),
            blockquote: e.isActive('blockquote'),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });

  const chain = () => editor!.chain().focus();
  const button = (
    label: string,
    Icon: LucideIcon,
    run: () => void,
    pressed?: boolean,
    disabled?: boolean,
  ) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={!editor || disabled}
      // Keep the caret in the text: a mouse click on the toolbar doesn't take focus.
      onMouseDown={(event) => event.preventDefault()}
      onClick={run}
      className={cn(
        'inline-flex size-8 cursor-pointer items-center justify-center rounded-sm text-ink hover:bg-surface',
        'focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-line-strong',
        pressed && 'bg-divider hover:bg-divider',
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
  const separator = <span aria-hidden className="mx-1 h-5 w-px bg-line" />;

  const applyLink = () => {
    if (linking === null || !editor) return;
    const href = linking.trim();
    if (href) chain().extendMarkRange('link').setLink({ href }).run();
    else chain().extendMarkRange('link').unsetLink().run();
    setLinking(null);
  };

  return (
    <>
      <div
        role="toolbar"
        aria-label={t('toolbar')}
        className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface-2 px-2 py-1.5"
      >
        <label className="w-[130px]">
          <span className="sr-only">{t('style')}</span>
          <select
            value={state?.block ?? 'p'}
            disabled={!editor}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'p') chain().setParagraph().run();
              else
                chain()
                  .setHeading({ level: value === 'h2' ? 2 : 3 })
                  .run();
            }}
            className="h-[30px] w-full cursor-pointer rounded-sm border border-line-strong bg-white px-2 text-[13px] focus-visible:outline-2 focus-visible:outline-brand"
          >
            <option value="p">{t('paragraph')}</option>
            <option value="h2">{t('heading2')}</option>
            <option value="h3">{t('heading3')}</option>
          </select>
        </label>
        {separator}
        {button(t('bold'), Bold, () => chain().toggleBold().run(), state?.bold)}
        {button(t('italic'), Italic, () => chain().toggleItalic().run(), state?.italic)}
        {button(
          t('link'),
          Link2,
          () =>
            setLinking(
              linking === null ? ((editor?.getAttributes('link').href as string | undefined) ?? '') : null,
            ),
          state?.link || linking !== null,
        )}
        {separator}
        {button(t('bulletList'), List, () => chain().toggleBulletList().run(), state?.bulletList)}
        {button(t('orderedList'), ListOrdered, () => chain().toggleOrderedList().run(), state?.orderedList)}
        {button(t('quote'), Quote, () => chain().toggleBlockquote().run(), state?.blockquote)}
        {pickImage &&
          button(t('image'), ImagePlus, () =>
            pickImage((image) => chain().setImage({ src: image.src, alt: image.alt }).run()),
          )}
        {separator}
        {button(t('undo'), Undo2, () => chain().undo().run(), undefined, !state?.canUndo)}
        {button(t('redo'), Redo2, () => chain().redo().run(), undefined, !state?.canRedo)}
      </div>
      {linking !== null && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            applyLink();
          }}
          className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-3 py-2"
        >
          <label className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-medium">
            {t('linkAddress')}
            <Input
              autoFocus
              type="url"
              value={linking}
              placeholder="https://"
              onChange={(event) => setLinking(event.target.value)}
              onKeyDown={(event) => event.key === 'Escape' && setLinking(null)}
              className="h-8 flex-1 md:text-small"
            />
          </label>
          <Button type="submit" size="sm" variant="quiet" className="h-8">
            {t('applyLink')}
          </Button>
          {state?.link && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => {
                chain().extendMarkRange('link').unsetLink().run();
                setLinking(null);
              }}
            >
              {t('removeLink')}
            </Button>
          )}
        </form>
      )}
    </>
  );
}

/** A bilingual rich text field: label, MK · EN switch, one editor per language (MK required). */
export function LocalizedRichTextField({
  id,
  label,
  required,
  aside,
  help,
  value,
  onChange,
  error,
  pickImage,
  minHeight,
  placeholder,
}: {
  id: string;
  label: string;
  required?: boolean;
  /** Grey note next to the label ("Rich text"). */
  aside?: React.ReactNode;
  help?: React.ReactNode;
  value: Localized;
  onChange: (value: Localized) => void;
  error?: string;
  pickImage?: PickImage;
  minHeight?: number;
  placeholder?: string;
}) {
  const t = useTranslations('admin.ui.localized');
  const [lang, setLang] = React.useState<Locale>('mk');
  const [lastError, setLastError] = React.useState(error);
  if (error !== lastError) {
    setLastError(error);
    if (error) setLang('mk');
  }
  const englishEmpty = !value.en?.trim();
  const labelId = `${id}-label`;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const showError = !!error && lang === 'mk';
  const helpText = lang === 'en' && englishEmpty ? t('fallback') : help;

  return (
    <div className="flex flex-col">
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <span id={labelId} className="text-small font-medium text-ink">
          {label}
          {required && lang === 'mk' && (
            <span className="text-brand-dark" aria-hidden>
              {' '}
              *
            </span>
          )}
          <span className="sr-only"> ({lang === 'mk' ? t('mkName') : t('enName')})</span>
        </span>
        <span className="flex items-center gap-3">
          {aside && <span className="text-[13px] text-muted-ink">{aside}</span>}
          <LanguageToggle
            label={label}
            lang={lang}
            onChange={setLang}
            mkError={!!error}
            englishEmpty={englishEmpty}
          />
        </span>
      </div>
      <RichTextEditor
        // One editor per language: switching loads the other text with its own undo history.
        key={lang}
        id={id}
        labelledBy={labelId}
        describedBy={[showError && errorId, helpText && helpId].filter(Boolean).join(' ') || undefined}
        value={lang === 'mk' ? value.mk : (value.en ?? '')}
        onChange={(html) => onChange(lang === 'mk' ? { ...value, mk: html } : { ...value, en: html })}
        lang={lang}
        invalid={showError}
        pickImage={pickImage}
        minHeight={minHeight}
        placeholder={placeholder}
      />
      {showError && <FieldError id={errorId}>{error}</FieldError>}
      {helpText && (
        <span id={helpId} className="mt-1.5 text-small text-muted-ink">
          {helpText}
        </span>
      )}
    </div>
  );
}
