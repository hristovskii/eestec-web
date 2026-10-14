import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getPrivacyPolicy, pageMetadata } from '@/features/settings/server';
import { currentLocale } from '@/shared/i18n/current-locale';
import { PageHeader } from '@/shared/layout/site/page-header';
import { Container } from '@/shared/ui/container';
import { Notice } from '@/shared/ui/notice';
import { RichText } from '@/shared/ui/rich-text';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const policy = await getPrivacyPolicy(locale);
  return pageMetadata('privacy', locale, policy.title);
}

// /privacy: rich-text page from the admin (Contact page layout, routes.md). D17: placeholder text for now.
export default async function PrivacyPage() {
  const locale = await currentLocale();
  const [policy, t, tNav] = await Promise.all([
    getPrivacyPolicy(locale),
    getTranslations('privacy'),
    getTranslations('nav'),
  ]);
  return (
    <>
      <PageHeader
        title={policy.title}
        breadcrumbs={[{ label: tNav('home'), href: '/' }, { label: policy.title }]}
      />
      <Container className="py-12 lg:py-16">
        <div className="flex max-w-[760px] flex-col gap-6">
          {policy.isPlaceholder && (
            <Notice tone="urgent" title={t('placeholderTitle')}>
              {t('placeholderText')}
            </Notice>
          )}
          <RichText html={policy.body} lang={policy.lang} />
        </div>
      </Container>
    </>
  );
}
