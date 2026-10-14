import { Check, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatBytes } from '@/features/media';
import { initials } from '@/shared/lib/initials';
import { cn } from '@/shared/lib/cn';
import { Container, Section } from '@/shared/ui/container';
import { Button } from '@/shared/ui/primitives/button';
import { SectionTitle } from '@/shared/ui/section-title';

import type { PublicPartnersPage } from '../../types';
import { PartnerIconView } from '../partner-icon';
import { PartnerWall, PastPartners } from './partner-tiers';

type Offer = NonNullable<PublicPartnersPage['offer']>;

const anchor = 'scroll-mt-20 lg:scroll-mt-24';

/** "(PDF, 2.4 MB)" after the offer's label; the sample file has no download. */
function OfferButton({
  label,
  offer,
  variant,
}: {
  label: string;
  offer: Offer;
  variant: 'outlineWhite' | 'primary';
}) {
  const t = useTranslations('partners.offer');
  const size = formatBytes(offer.size);
  const text = variant === 'primary' ? label : t('withSize', { label, size });
  if (!offer.file)
    return (
      <Button variant={variant} disabled title={t('sample')}>
        <Download aria-hidden />
        {text}
      </Button>
    );
  return (
    <Button asChild variant={variant}>
      <a href={offer.file.src} download>
        <Download aria-hidden />
        {text}
      </a>
    </Button>
  );
}

// ─── Red top: title, buttons and "Who you reach" ───

export function PartnersHero({ page }: { page: PublicPartnersPage }) {
  const { hero, reach, offer } = page;
  return (
    <section
      aria-label={hero.title}
      className="bg-brand bg-[radial-gradient(rgb(255_255_255/0.16)_1.5px,transparent_1.6px)] bg-size-[22px_22px] text-white"
    >
      <Container
        className={
          reach.stats.length > 0
            ? 'grid gap-8 py-11 pb-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-14 lg:py-20 lg:pb-22'
            : 'py-11 pb-10 lg:py-20 lg:pb-22'
        }
      >
        <div className="flex flex-col items-start gap-4 lg:gap-5.5">
          {hero.eyebrow && (
            <span className="text-small font-bold tracking-[0.1em] uppercase">{hero.eyebrow}</span>
          )}
          <h1 className="text-[34px] leading-[1.15] font-bold lg:text-[56px] lg:leading-[1.1]">
            {hero.title}
          </h1>
          <p className="max-w-145 text-[18px] leading-[1.5] font-medium lg:text-[20px]">{hero.lead}</p>
          <div className="flex w-full flex-col gap-3 pt-1 sm:w-auto sm:flex-row sm:gap-3.5">
            <Button asChild variant="inverse">
              <a href="#contact">{hero.primaryLabel}</a>
            </Button>
            {offer && <OfferButton label={hero.offerLabel} offer={offer} variant="outlineWhite" />}
          </div>
        </div>
        {reach.stats.length > 0 && (
          <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 text-ink shadow-[0_24px_48px_rgb(0_0_0/0.18)] lg:p-7">
            {reach.title && <h2 className="eyebrow">{reach.title}</h2>}
            <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 lg:gap-3">
              {reach.stats.map((stat) => (
                <li
                  key={stat.id}
                  className="flex flex-col gap-0.5 rounded-xl bg-surface p-3.5 lg:gap-1 lg:p-4"
                >
                  <strong className="text-[24px] leading-[1.1] font-bold text-brand-dark lg:text-[30px]">
                    {stat.value}
                  </strong>
                  <span className="text-[13px] leading-[1.4] text-muted-ink lg:text-small">{stat.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Container>
    </section>
  );
}

// ─── What your company gets ───

export function WhyPartner({ page }: { page: PublicPartnersPage }) {
  const { why } = page;
  if (why.cards.length === 0) return null;
  return (
    <Section aria-labelledby="why-title">
      <div className="flex flex-col gap-6 lg:gap-12">
        <SectionTitle id="why-title" eyebrow={why.eyebrow || undefined} title={why.title} />
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {why.cards.map((card) => (
            <li
              key={card.id}
              className="grid grid-cols-[44px_minmax(0,1fr)] gap-3.5 rounded-xl border border-line p-4 lg:grid-cols-1 lg:gap-3 lg:px-6 lg:py-7"
            >
              <span
                aria-hidden
                className="flex size-11 items-center justify-center rounded-xl bg-brand-tint text-brand lg:size-12"
              >
                <PartnerIconView icon={card.icon} className="size-5.5 lg:size-6" />
              </span>
              <div className="flex flex-col gap-1 lg:gap-3">
                <h3 className="text-[17px] font-bold lg:text-[19px]">{card.title}</h3>
                <p className="text-small leading-[1.5] text-muted-ink lg:text-[15px]">{card.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

// ─── Ways to work together: packages, single collaborations, the offer ───

function PackageCard({
  item,
  badge,
}: {
  item: PublicPartnersPage['packages']['items'][number];
  badge: string;
}) {
  return (
    <li
      className={cn(
        'relative flex flex-col gap-4.5 rounded-2xl bg-white px-5 py-6 lg:px-7 lg:py-8',
        item.highlighted ? 'border-2 border-brand shadow-[0_16px_40px_rgb(0_0_0/0.1)]' : 'border border-line',
      )}
    >
      {item.highlighted && badge && (
        <span className="absolute -top-3.5 left-5 inline-flex h-7 items-center rounded-full bg-brand px-3 text-small font-medium text-white lg:left-7">
          {badge}
        </span>
      )}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[21px] font-bold lg:text-[24px]">{item.name}</h3>
        <p className="text-small leading-[1.5] text-muted-ink lg:text-[15px]">{item.text}</p>
        {item.priceText && <p className="text-body font-bold text-ink">{item.priceText}</p>}
      </div>
      {item.items.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2.5 border-t border-divider p-0 pt-3.5 lg:gap-3 lg:pt-4">
          {item.items.map((line) => (
            <li key={line} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2.5 text-[15px] leading-[1.5]">
              <Check className="size-5 text-brand" strokeWidth={2.6} aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
      <Button asChild variant={item.highlighted ? 'primary' : 'secondary'} className="mt-auto" block>
        <a href="#contact">{item.cta}</a>
      </Button>
    </li>
  );
}

export function PackagesSection({ page }: { page: PublicPartnersPage }) {
  const t = useTranslations('partners.offer');
  const { packages, offer } = page;
  if (packages.items.length === 0 && packages.singles.length === 0 && !offer) return null;
  return (
    <Section tone="grey" aria-labelledby="packages-title">
      <div className="flex flex-col gap-5.5 lg:gap-10">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end lg:gap-6">
          <SectionTitle id="packages-title" eyebrow={packages.eyebrow || undefined} title={packages.title} />
          {packages.note && <p className="max-w-105 text-body text-muted-ink">{packages.note}</p>}
        </div>

        {packages.items.length > 0 && (
          <ul className="m-0 grid list-none grid-cols-1 items-stretch gap-5 p-0 lg:grid-cols-3 lg:gap-6">
            {packages.items.map((item) => (
              <PackageCard key={item.id} item={item} badge={packages.badge} />
            ))}
          </ul>
        )}

        {packages.singles.length > 0 && (
          <div className="flex flex-col gap-3 lg:gap-4">
            {packages.singlesTitle && (
              <h3 className="text-[18px] font-bold lg:text-[20px]">{packages.singlesTitle}</h3>
            )}
            <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 lg:grid-cols-4 lg:gap-4">
              {packages.singles.map((single) => (
                <li
                  key={single.id}
                  className="flex flex-col gap-2 rounded-xl bg-white p-4 lg:grid lg:grid-cols-[44px_minmax(0,1fr)] lg:items-start lg:gap-3.5 lg:p-5"
                >
                  <span
                    aria-hidden
                    className="flex size-9.5 items-center justify-center rounded-[10px] bg-brand-tint text-brand lg:size-11 lg:rounded-xl"
                  >
                    <PartnerIconView icon={single.icon} className="size-5 lg:size-5.5" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <strong className="text-[15px] font-medium lg:text-body">{single.title}</strong>
                    <span className="text-[14px] leading-[1.4] text-muted-ink lg:text-small">
                      {single.text}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {offer && (
          <div className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-5 lg:grid lg:grid-cols-[64px_minmax(0,1fr)_auto] lg:items-center lg:gap-6 lg:px-8 lg:py-7">
            <div className="flex items-center gap-3.5 lg:contents">
              <span
                aria-hidden
                className="flex h-13.5 w-11 shrink-0 items-end justify-center rounded-md bg-brand-dark pb-2 text-[12px] font-bold text-white lg:h-17 lg:w-14 lg:rounded-lg lg:pb-2.5 lg:text-small"
              >
                PDF
              </span>
              <div className="flex min-w-0 flex-col gap-0.5 lg:gap-1">
                <strong className="text-[17px] lg:text-[20px]">{offer.title}</strong>
                <span className="text-small text-muted-ink lg:text-body">
                  {offer.text && <span className="hidden lg:inline">{offer.text} </span>}
                  {offer.pages
                    ? t('meta', { size: formatBytes(offer.size), pages: offer.pages })
                    : t('metaNoPages', { size: formatBytes(offer.size) })}
                </span>
              </div>
            </div>
            {offer.file ? (
              <OfferButton label={offer.downloadLabel} offer={offer} variant="primary" />
            ) : (
              <span className="text-small text-muted-ink">{t('sample')}</span>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── Companies that already work with us ───

export function PartnersWall({ page }: { page: PublicPartnersPage }) {
  const { partners, tiers, past } = page;
  if (tiers.length === 0 && past.length === 0) return null;
  return (
    <Section aria-labelledby="partners-title">
      <div className="flex flex-col items-center gap-7 lg:gap-12">
        <SectionTitle
          id="partners-title"
          align="center"
          eyebrow={partners.eyebrow || undefined}
          title={partners.title}
        />
        {tiers.length > 0 && <PartnerWall tiers={tiers} />}
        <PastPartners title={partners.pastTitle} sponsors={past} />
      </div>
    </Section>
  );
}

// ─── Let's talk ───

/** The contact column; the inquiry form (M11c) goes next to it. */
export function PartnersContact({
  page,
  children,
}: {
  page: PublicPartnersPage;
  /** The form. */
  children?: React.ReactNode;
}) {
  const { contact } = page;
  const person = contact.person;
  return (
    <section id="contact" aria-labelledby="contact-title" className={cn('pt-2 pb-14 lg:pb-24', anchor)}>
      <Container
        className={cn(
          'grid gap-5 lg:gap-14',
          children ? 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start' : 'max-w-[calc(720px+48px)]',
        )}
      >
        <div className="flex flex-col gap-5 lg:gap-5.5 lg:pt-3">
          <SectionTitle id="contact-title" eyebrow={contact.eyebrow || undefined} title={contact.title} />
          {contact.text && <p className="text-body leading-[1.6] lg:text-[18px]">{contact.text}</p>}
          <div className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-3.5 rounded-xl bg-surface p-4 lg:grid-cols-[56px_minmax(0,1fr)] lg:gap-4 lg:rounded-2xl lg:p-5">
            <span
              aria-hidden
              className="flex size-12 items-center justify-center rounded-full bg-ink text-[16px] font-bold text-white lg:size-14 lg:text-[18px]"
            >
              {initials(person.name)}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <strong className="text-[16px] lg:text-[17px]">{person.name}</strong>
              {person.role && <span className="text-small text-muted-ink">{person.role}</span>}
              <a
                href={`mailto:${person.email}`}
                className="text-small font-medium break-all text-brand-dark hover:text-brand"
              >
                {person.email}
              </a>
            </div>
          </div>
        </div>
        {children}
      </Container>
    </section>
  );
}
