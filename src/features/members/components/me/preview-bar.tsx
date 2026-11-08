import { Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/shared/i18n/navigation';
import { Container } from '@/shared/ui/container';
import { Notice } from '@/shared/ui/notice';

/** "See what visitors see →" from /profile: the person's own page as a visitor gets it, with a way back. */
export function PreviewBar() {
  const t = useTranslations('members.profile.preview');
  return (
    <Container className="pt-4">
      <Notice
        tone="dark"
        role="status"
        icon={<Eye className="size-[22px]" />}
        title={t('title')}
        actions={
          <Link href="/profile" className="text-small font-medium text-white underline underline-offset-2">
            {t('back')}
          </Link>
        }
      >
        {t('text')}
      </Notice>
    </Container>
  );
}
