import { cn } from '@/shared/lib/cn';

/**
 * Board-written rich text on public pages (EventDetail `.rich`): 17 px paragraphs, red list
 * markers, 22 px subheadings. `html` must already be sanitized (shared/lib/sanitize-html), which
 * the queries do before caching.
 */
export function RichText({ html, lang, className }: { html: string; lang?: string; className?: string }) {
  return (
    <div
      lang={lang}
      className={cn(
        'flex flex-col gap-4 text-[17px] leading-[1.7] text-ink',
        '[&_h2]:mt-3 [&_h2]:text-[22px] [&_h2]:leading-[1.3] [&_h2]:font-bold',
        '[&_h3]:mt-3 [&_h3]:text-[22px] [&_h3]:leading-[1.3] [&_h3]:font-bold',
        '[&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5.5 [&_ul]:leading-[1.6]',
        '[&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-5.5 [&_ol]:leading-[1.6]',
        '[&_li_p]:m-0 [&_li::marker]:text-brand',
        '[&_a]:font-medium [&_a]:text-brand-dark [&_a]:underline [&_a:hover]:no-underline',
        '[&_blockquote]:border-l-4 [&_blockquote]:border-brand [&_blockquote]:pl-5 [&_blockquote]:text-ink-2',
        '[&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-md',
        className,
      )}
      // Sanitized on save and again before caching (never raw board input).
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
