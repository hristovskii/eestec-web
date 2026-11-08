import { Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CopyButton } from './copy-button';
import { SocialIcon } from './social-icon';

const linkClass =
  'inline-flex size-11 items-center justify-center rounded-full border border-line-input bg-white text-ink no-underline hover:border-brand hover:text-brand-dark focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand';

/**
 * "Share this …" (MemoryPost): copy the link, Facebook, LinkedIn, WhatsApp, e-mail. Plain links to
 * the sharing pages, so nothing from those sites is loaded here. `url` is absolute.
 */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const t = useTranslations('ui.share');
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(`${title} ${url}`);
  const links = [
    {
      key: 'facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      icon: <SocialIcon name="facebook" />,
    },
    {
      key: 'linkedin',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
      icon: <SocialIcon name="linkedin" />,
    },
    { key: 'whatsapp', href: `https://wa.me/?text=${text}`, icon: <WhatsAppIcon /> },
    {
      key: 'email',
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encoded}`,
      icon: <Mail className="size-5" aria-hidden />,
    },
  ] as const;
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <CopyButton
        value={url}
        label={t('copy')}
        copiedLabel={t('copied')}
        className="size-11 rounded-full border-line-input text-ink"
      />
      {links.map((link) => (
        <a
          key={link.key}
          href={link.href}
          className={linkClass}
          aria-label={t(link.key)}
          {...(link.key === 'email' ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
        >
          {link.icon}
        </a>
      ))}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-5"
    >
      <path d="M3 21l1.65-4.8A8.5 8.5 0 1 1 8.1 19.4L3 21z" />
      <path d="M9 10c0 3 2 5 5 5l1.2-1.4-1.9-1-.8.6c-.7-.3-1.3-.9-1.6-1.6l.6-.8-1-1.9L9 10z" />
    </svg>
  );
}
