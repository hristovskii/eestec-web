import { Building2, Mail, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type * as React from 'react';

import { CopyButton } from '@/shared/ui/copy-button';
import { Container } from '@/shared/ui/container';
import { cn } from '@/shared/lib/cn';

import type { PublicContact } from '../../types';

/** What the details need from Settings, in the language of the page. */
export type ContactDetailsData = {
  email: string;
  address: string;
  officeRoom: string;
  /** "Wednesdays", "18:00": the weekly meeting, when Settings shows it. */
  meeting: { day: string; time: string } | null;
  boardRoles: { id: string; title: string; email: string }[];
};

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)] items-start gap-3.5">
      <span
        aria-hidden
        className="flex size-10 items-center justify-center rounded-[10px] bg-brand-tint text-brand"
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-small text-muted-ink">{label}</span>
        {children}
      </div>
    </div>
  );
}

/**
 * The two cards next to the form (ContactPage): contact info with the copy button, and "Write to a
 * board member". Without a form (`aside` false) they sit side by side.
 */
export function ContactDetails({
  page,
  data,
  form,
}: {
  page: PublicContact;
  data: ContactDetailsData;
  /** The form (ContactForm); the cards stay beside it. */
  form?: React.ReactNode;
}) {
  const t = useTranslations('contact.info');
  const tCopy = useTranslations('contact.copy');
  return (
    <Container className="pt-6 pb-10 lg:pt-14 lg:pb-18">
      <div
        className={cn(
          'grid gap-5 lg:gap-10',
          form && 'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start',
        )}
      >
        {form}
        <aside
          aria-label={t('label')}
          className={cn(
            'flex flex-col gap-5',
            form ? 'lg:sticky lg:top-24' : 'lg:grid lg:grid-cols-2 lg:items-start',
          )}
        >
          <div className="flex flex-col gap-4.5 rounded-lg border border-line bg-white p-5 lg:gap-5 lg:p-7">
            <h2 className="text-[19px] leading-[1.3] font-bold lg:text-[20px]">{page.headings.info}</h2>
            <InfoRow icon={<Mail className="size-5" />} label={t('email')}>
              <span className="flex items-center justify-between gap-2.5">
                <a
                  href={`mailto:${data.email}`}
                  className="flex min-h-8 items-center text-[18px] font-bold break-all text-ink no-underline hover:text-brand-dark hover:underline lg:text-[20px]"
                >
                  {data.email}
                </a>
                <CopyButton
                  value={data.email}
                  label={tCopy('email')}
                  copiedLabel={tCopy('copied')}
                  className="max-lg:hidden"
                />
              </span>
            </InfoRow>
            <InfoRow icon={<MapPin className="size-5" />} label={t('address')}>
              <span className="text-[15px] leading-[1.5] font-medium lg:text-[16px]">{data.address}</span>
            </InfoRow>
            <InfoRow icon={<Building2 className="size-5" />} label={t('office')}>
              <span className="text-[15px] leading-[1.5] font-medium lg:text-[16px]">
                {data.officeRoom}
                {data.meeting && (
                  <>
                    <br />
                    {t('meeting', data.meeting)}
                  </>
                )}
              </span>
            </InfoRow>
          </div>

          {data.boardRoles.length > 0 && (
            <div className="rounded-lg border border-line bg-white px-5 pt-4.5 pb-1.5 lg:px-7 lg:pt-6 lg:pb-3">
              <h2 className="mb-1.5 text-[17px] font-bold lg:mb-2 lg:text-[18px]">{page.headings.board}</h2>
              <dl className="m-0">
                {data.boardRoles.map((role) => (
                  <div
                    key={role.id}
                    className="flex flex-col gap-0.5 border-t border-divider py-3 text-[15px] lg:flex-row lg:justify-between lg:gap-3"
                  >
                    <dt className="text-small text-muted-ink lg:text-[15px]">{role.title}</dt>
                    <dd className="m-0">
                      <a
                        href={`mailto:${role.email}`}
                        className="font-medium text-ink no-underline hover:text-brand-dark hover:underline"
                      >
                        {role.email}
                      </a>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </aside>
      </div>
    </Container>
  );
}
