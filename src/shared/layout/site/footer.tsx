import { useTranslations } from 'next-intl';

import { EESTEC_NET_URL, type FooterNavKey } from '@/shared/config/site';
import { Link } from '@/shared/i18n/navigation';
import { BrandLogo } from '@/shared/ui/brand-logo';
import { SocialIcon, type SocialIconName } from '@/shared/ui/social-icon';

/** What the footer needs from Settings (contact & legal, social links, branding). */
export type FooterData = {
  siteName: string;
  tagline: string;
  address: string;
  email: string;
  meeting: { day: string; time: string; room: string };
  socialLinks: { platform: SocialIconName; url: string }[];
  legal: { registrationNumber: string; taxNumber: string };
  year: number;
};

export type FooterLink = { key: FooterNavKey; href: string };

type SiteFooterProps = {
  data: FooterData;
  explore: FooterLink[];
  getInvolved: FooterLink[];
};

const linkClass =
  'text-white no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
const headingClass = 'mb-1 text-small font-bold tracking-[0.08em] uppercase';

/** Red footer (Footer): logo, tagline, social, two link columns, contact, legal line. */
export function SiteFooter({ data, explore, getInvolved }: SiteFooterProps) {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');
  const label = (key: FooterNavKey) =>
    key === 'submit' ? t('submit') : key === 'partners' ? t('partners') : tNav(key);

  return (
    <footer className="bg-brand font-medium text-white">
      <div className="mx-auto max-w-[calc(1200px+48px)] px-4 pt-10 sm:px-6 lg:pt-16">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr_1fr_1.3fr] lg:gap-12">
          <div className="flex flex-col gap-4 lg:gap-5">
            <BrandLogo
              variant="white"
              height={80}
              alt={data.siteName}
              className="-ml-1.5 h-[72px] w-auto self-start lg:h-20"
            />
            <p className="max-w-[320px] text-[15px] leading-[1.6]">{data.tagline}</p>
            <ul className="flex gap-2">
              {data.socialLinks.map((social) => (
                <li key={social.platform}>
                  <a
                    href={social.url}
                    aria-label={t(`social.${social.platform}`)}
                    className="flex size-11 items-center justify-center rounded-full border border-white/60 text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <SocialIcon name={social.platform} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-6 text-[15px] lg:contents">
            <nav aria-label={t('explore')} className="flex flex-col lg:gap-3">
              <h2 className={headingClass}>{t('explore')}</h2>
              {explore.map((item) => (
                <Link key={item.key} href={item.href} className={`${linkClass} py-2.5 lg:py-0`}>
                  {label(item.key)}
                </Link>
              ))}
            </nav>
            <nav aria-label={t('getInvolved')} className="flex flex-col lg:gap-3">
              <h2 className={headingClass}>{t('getInvolved')}</h2>
              {getInvolved.map((item) => (
                <Link key={item.key} href={item.href} className={`${linkClass} py-2.5 lg:py-0`}>
                  {label(item.key)}
                </Link>
              ))}
              <a href={EESTEC_NET_URL} className={`${linkClass} py-2.5 lg:py-0`}>
                {t('eestecNet')}
              </a>
            </nav>
          </div>

          <div className="flex flex-col gap-2.5 text-[15px] leading-[1.5] lg:gap-3">
            <h2 className={headingClass}>{t('contact')}</h2>
            <p>{data.address}</p>
            <a href={`mailto:${data.email}`} className="text-white underline">
              {data.email}
            </a>
            <p>{t('meeting', data.meeting)}</p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/35 pt-5 pb-6 text-small lg:mt-14">
          <span>
            {t('copyright', { year: data.year, name: data.siteName })}
            <span className="hidden sm:inline">
              {' '}
              · {t('registration', { number: data.legal.registrationNumber })}
            </span>
            <span className="hidden lg:inline"> · {t('tax', { number: data.legal.taxNumber })}</span>
          </span>
          <span className="flex gap-5">
            <Link href="/privacy" className="text-white underline">
              {t('privacy')}
            </Link>
            {/* /admin is a separate root layout: a full page load is intended. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/admin" className="text-white underline">
              {t('boardLogin')}
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
