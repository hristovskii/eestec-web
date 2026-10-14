import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/shared/i18n/navigation';
import { Container } from '@/shared/ui/container';
import { CopyButton } from '@/shared/ui/copy-button';
import { SocialIcon, type SocialIconName } from '@/shared/ui/social-icon';

import type { PublicContact } from '../../types';

export type SocialData = { platform: SocialIconName; handle: string; url: string }[];

/** The association's registration details, as Settings has them. */
export type LegalData = {
  fullName: string;
  shortName: string;
  registrationNumber: string;
  taxNumber: string;
  bankAccount: string;
  bankName: string;
  registeredSeat: string;
};

/** "Follow us" (links to the profiles) and "Legal info" (with copy buttons), side by side from 1024 px. */
export function ContactLower({
  page,
  social,
  legal,
}: {
  page: PublicContact;
  social: SocialData;
  legal: LegalData;
}) {
  const tSocial = useTranslations('footer.social');
  const t = useTranslations('contact.legal');
  const tCopy = useTranslations('contact.copy');
  const bank = [legal.bankAccount, legal.bankName].filter(Boolean).join(' · ');
  const rows = [
    { key: 'fullName', value: legal.fullName, copy: false },
    { key: 'shortName', value: legal.shortName, copy: false },
    { key: 'registrationNumber', value: legal.registrationNumber, copy: true },
    { key: 'taxNumber', value: legal.taxNumber, copy: true },
    { key: 'bankAccount', value: bank, copy: true },
    { key: 'registeredSeat', value: legal.registeredSeat, copy: false },
  ] as const;
  const shown = rows.filter((row) => row.value);
  if (social.length === 0 && shown.length === 0) return null;
  return (
    <Container className="pb-14 lg:pb-24">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-10">
        {social.length > 0 && (
          <section aria-labelledby="contact-social-title" className="flex flex-col gap-3.5 lg:gap-5">
            <h2
              id="contact-social-title"
              className="text-[22px] leading-[1.3] font-bold lg:text-[28px] lg:leading-[1.25]"
            >
              {page.headings.social}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {social.map((link) => (
                <li key={link.platform}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid grid-cols-[48px_minmax(0,1fr)_20px] items-center gap-4 rounded-md border border-line px-3.5 py-3 text-ink no-underline transition-shadow hover:border-brand hover:shadow-[0_0_0_1px_var(--color-brand)] lg:grid-cols-[56px_minmax(0,1fr)_20px] lg:px-4.5 lg:py-4"
                  >
                    <span
                      aria-hidden
                      className="flex size-12 items-center justify-center rounded-xl bg-brand-tint text-brand lg:size-14 lg:rounded-[14px]"
                    >
                      <SocialIcon name={link.platform} className="size-6 lg:size-6.5" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <strong className="text-[16px] lg:text-[17px]">{tSocial(link.platform)}</strong>
                      <span className="text-small text-muted-ink">{link.handle}</span>
                    </span>
                    <ArrowUpRight aria-hidden className="size-4.5 text-brand" />
                    <span className="sr-only">{tCopy('newTab')}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        {shown.length > 0 && (
          <section aria-labelledby="contact-legal-title" className="flex flex-col gap-3.5 lg:gap-5">
            <h2
              id="contact-legal-title"
              className="text-[22px] leading-[1.3] font-bold lg:text-[28px] lg:leading-[1.25]"
            >
              {page.headings.legal}
            </h2>
            <div className="rounded-lg border border-line bg-white px-4.5 pt-1.5 pb-4 lg:px-7 lg:pt-2.5 lg:pb-4.5">
              <dl className="m-0">
                {shown.map((row, index) => (
                  <div
                    key={row.key}
                    className={`flex flex-col gap-1 py-3.5 lg:grid lg:grid-cols-[190px_minmax(0,1fr)] lg:items-center lg:gap-4 ${index > 0 ? 'border-t border-divider' : ''}`}
                  >
                    <dt className="text-small text-muted-ink">{t(row.key)}</dt>
                    <dd className="m-0 flex items-center justify-between gap-3">
                      <span
                        className={`text-[15px] font-medium break-words lg:text-[16px] ${row.copy ? 'tracking-[0.02em] tabular-nums' : ''}`}
                      >
                        {row.value}
                      </span>
                      {row.copy && (
                        <CopyButton
                          value={row.value}
                          label={tCopy('field', { name: t(row.key) })}
                          copiedLabel={tCopy('copied')}
                        />
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <Link
                href="/join#rules"
                className="mt-2.5 inline-flex min-h-10 items-center text-small font-medium text-brand-dark no-underline hover:underline"
              >
                {t('statute')} →
              </Link>
            </div>
          </section>
        )}
      </div>
    </Container>
  );
}
