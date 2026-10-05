import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { type Access, ADMIN_AREAS, type AdminArea, type AdminRole, PERMISSIONS } from '@/features/auth';
import { AdminBadge, TablePanel } from '@/shared/admin-ui/admin-page';

const ROLES: AdminRole[] = ['super_admin', 'editor', 'event_manager'];

const headClass =
  'h-10 border-b border-line bg-surface-2 px-3 text-center text-[12px] font-medium tracking-[0.04em] whitespace-nowrap text-muted-ink uppercase first:pl-5 first:text-left last:pr-5';
const cellClass =
  'h-11.5 border-b border-divider px-3 text-center align-middle first:pl-5 first:text-left last:pr-5';

/**
 * Roles & permissions (AdminUsers), drawn from the code that enforces it (PERMISSIONS, D18):
 * what this table says is exactly what the admin allows.
 */
export function PermissionsMatrix() {
  const t = useTranslations('admin.users.matrix');
  const tRoles = useTranslations('admin.roles');

  const cell = (area: AdminArea, access: Access) => {
    switch (access) {
      case 'full':
        return <Check className="mx-auto size-[18px]" strokeWidth={2.6} aria-label={t('full')} />;
      case 'none':
        return (
          <span className="text-muted-ink" aria-label={t('none')}>
            —
          </span>
        );
      case 'own':
        return (
          <AdminBadge tone="neutral" dot={false}>
            {area === 'media' ? t('ownUploads') : t('own')}
          </AdminBadge>
        );
      case 'read':
        return (
          <AdminBadge tone="neutral" dot={false}>
            {t('read')}
          </AdminBadge>
        );
      case 'ownRead':
        return (
          <AdminBadge tone="neutral" dot={false}>
            {t('ownRead')}
          </AdminBadge>
        );
    }
  };

  return (
    <TablePanel aria-labelledby="permissions-title">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-divider px-4 py-4 md:px-5">
        <h2 id="permissions-title" className="text-[16px] font-bold">
          {t('title')}
        </h2>
        <span className="text-[13px] text-muted-ink">{t('hint')}</span>
      </div>
      {/* Scrolls sideways on phones: focusable so it can be scrolled with the keyboard. */}
      <div
        role="region"
        aria-label={t('title')}
        tabIndex={0}
        className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
      >
        <table className="w-full min-w-[640px] border-collapse text-small">
          <caption className="sr-only">{t('title')}</caption>
          <thead>
            <tr>
              <th scope="col" className={headClass}>
                {t('area')}
              </th>
              {ROLES.map((role) => (
                <th key={role} scope="col" className={headClass}>
                  {tRoles(role)}
                  {role === 'editor' && (
                    <span className="block font-normal tracking-normal normal-case">{t('editorHint')}</span>
                  )}
                </th>
              ))}
              <th scope="col" className={headClass}>
                {t('member')}
              </th>
            </tr>
          </thead>
          <tbody>
            {ADMIN_AREAS.map((area) => (
              <tr key={area}>
                <th scope="row" className={`${cellClass} font-medium`}>
                  {t(`areas.${area}`)}
                </th>
                {ROLES.map((role) => (
                  <td key={role} className={cellClass}>
                    {cell(area, PERMISSIONS[area][role])}
                  </td>
                ))}
                <td className={cellClass}>{cell(area, 'none')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-divider px-4 py-3.5 text-[13px] text-muted-ink md:px-5">{t('footer')}</p>
    </TablePanel>
  );
}
