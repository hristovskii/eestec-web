'use client';

import {
  BriefcaseBusiness,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  ExternalLink,
  Flag,
  Folder,
  House,
  Image as ImageIcon,
  Inbox,
  LayoutGrid,
  Lightbulb,
  LogOut,
  Mail,
  Map,
  Menu,
  Shield,
  SlidersHorizontal,
  SquareCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import type { AdminNavGroupKey, AdminNavKey } from '@/shared/config/admin-nav';
import { useStoredFlag } from '@/shared/hooks/use-stored-flag';
import { cn } from '@/shared/lib/cn';
import { BrandLogo } from '@/shared/ui/brand-logo';
import { InitialsAvatar } from '@/shared/ui/cards';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/shared/ui/primitives/sheet';

const icons: Record<AdminNavKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutGrid,
  approvals: SquareCheck,
  inbox: Inbox,
  events: Calendar,
  applications: ClipboardList,
  members: Users,
  memories: ImageIcon,
  ideas: Lightbulb,
  home: House,
  map: Map,
  journey: Flag,
  join: UserPlus,
  sponsors: BriefcaseBusiness,
  contact: Mail,
  media: Folder,
  settings: SlidersHorizontal,
  users: Shield,
};

export type AdminShellItem = { key: AdminNavKey; href: string; count?: number };
export type AdminShellGroup = { key: AdminNavGroupKey; items: AdminShellItem[] };
export type AdminShellUser = { name: string; initials: string; roleLabel: string };

type AdminShellProps = {
  groups: AdminShellGroup[];
  user: AdminShellUser;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
};

const COLLAPSE_KEY = 'eestec-admin-sidebar-collapsed';

/** A page below a sidebar section adds its own last crumb ("Admin › Events › Workshop: AI…"). */
const PageCrumbContext = React.createContext<(label: string | null) => void>(() => undefined);

/** Renders nothing; sets the last breadcrumb of the top bar while the page is shown. */
export function AdminPageCrumb({ label }: { label: string }) {
  const setCrumb = React.use(PageCrumbContext);
  React.useEffect(() => {
    setCrumb(label);
    return () => setCrumb(null);
  }, [label, setCrumb]);
  return null;
}

const isCurrent = (pathname: string, href: string) =>
  href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`);

/**
 * Admin frame (AdminSidebar, AdminTopbar, AdminMobile): wide sidebar from 1280 px (collapsible to
 * the rail), icon rail from 768 px, drawer + mobile header below.
 */
export function AdminShell({ groups, user, signOutAction, children }: AdminShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useStoredFlag(COLLAPSE_KEY);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [pageCrumb, setPageCrumb] = React.useState<string | null>(null);
  const t = useTranslations('admin.shell');
  const toggleCollapsed = () => setCollapsed(!collapsed);

  return (
    <PageCrumbContext value={setPageCrumb}>
      <div className="flex min-h-dvh bg-surface text-ink">
        <aside
          className={cn(
            'sticky top-0 hidden h-dvh shrink-0 overflow-y-auto border-r border-line bg-white md:block',
            collapsed ? 'w-18' : 'w-18 xl:w-62',
          )}
        >
          <SidebarNav
            groups={groups}
            pathname={pathname}
            variant={collapsed ? 'rail' : 'responsive'}
            onToggle={toggleCollapsed}
            collapsed={collapsed}
          />
        </aside>

        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-[300px] p-0">
            <SheetTitle className="sr-only">{t('menu')}</SheetTitle>
            <div className="flex items-center gap-3 border-b border-divider px-4 py-3 pr-14">
              <InitialsAvatar initials={user.initials} size={34} />
              <span className="flex flex-col text-small leading-tight">
                <strong>{user.name}</strong>
                <span className="text-muted-ink">{user.roleLabel}</span>
              </span>
            </div>
            <SidebarNav
              groups={groups}
              pathname={pathname}
              variant="wide"
              onNavigate={() => setDrawerOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            pathname={pathname}
            groups={groups}
            user={user}
            signOutAction={signOutAction}
            onOpenMenu={() => setDrawerOpen(true)}
            pageCrumb={pageCrumb}
          />
          <main id="main" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>
        </div>
      </div>
    </PageCrumbContext>
  );
}

function SidebarNav({
  groups,
  pathname,
  variant,
  collapsed,
  onToggle,
  onNavigate,
}: {
  groups: AdminShellGroup[];
  pathname: string;
  /** responsive: rail below 1280 px, wide above. */
  variant: 'wide' | 'rail' | 'responsive';
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const t = useTranslations('admin.nav');
  const tShell = useTranslations('admin.shell');
  // Classes that only apply when the sidebar shows text.
  const wide = variant === 'wide' ? '' : variant === 'rail' ? 'hidden' : 'hidden xl:inline';
  const railOnly = variant === 'wide' ? 'hidden' : variant === 'rail' ? '' : 'xl:hidden';

  return (
    <nav aria-label={tShell('sections')} className="flex min-h-full flex-col gap-1 p-3">
      <div
        className={cn(
          'mb-2 flex h-13 items-center gap-2.5 border-b border-divider px-2',
          variant !== 'wide' && 'justify-center xl:justify-start',
          variant === 'rail' && 'xl:justify-center',
        )}
      >
        <span
          className={cn(
            'items-center gap-2.5',
            variant === 'wide' ? 'flex' : variant === 'rail' ? 'hidden' : 'hidden xl:flex',
          )}
        >
          <BrandLogo variant="red" height={34} alt="EESTEC LC Skopje" />
          <span className="inline-flex h-[22px] items-center rounded-[6px] bg-surface px-2 text-[12px] font-bold tracking-[0.06em] text-muted-ink">
            ADMIN
          </span>
        </span>
        <span className={railOnly}>
          <BrandLogo variant="icon" height={36} alt="EESTEC LC Skopje admin" className="rounded-sm" />
        </span>
      </div>

      {groups.map((group, index) => (
        <div key={group.key} className={cn('flex flex-col gap-0.5', index > 0 && 'pt-3.5')}>
          {group.key !== 'main' && (
            <span
              className={cn(
                'px-3 pt-1.5 pb-1 text-[11px] font-bold tracking-[0.08em] text-muted-ink uppercase',
                wide,
              )}
            >
              {t(`groups.${group.key}`)}
            </span>
          )}
          {group.items.map((item) => {
            const Icon = icons[item.key];
            const current = isCurrent(pathname, item.href);
            const label = t(item.key);
            return (
              <Link
                key={item.key}
                href={item.href as Route}
                onClick={onNavigate}
                aria-current={current ? 'page' : undefined}
                title={label}
                className={cn(
                  'relative flex h-[38px] items-center gap-2.5 rounded-sm px-3 text-small whitespace-nowrap no-underline',
                  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
                  variant === 'responsive' && 'justify-center xl:justify-start',
                  variant === 'rail' && 'justify-center',
                  current
                    ? 'bg-brand-tint font-bold text-brand-dark'
                    : 'font-medium text-ink hover:bg-surface',
                )}
              >
                <Icon
                  className={cn('size-[18px] shrink-0', current ? 'text-brand' : 'text-ink')}
                  aria-hidden
                />
                <span className={cn('flex-1', wide)}>{label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <>
                    <span
                      className={cn(
                        'inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-brand px-[7px] text-[12px] font-bold text-white',
                        wide,
                      )}
                    >
                      {item.count}
                    </span>
                    <span
                      aria-label={tShell('waiting', { count: item.count })}
                      className={cn(
                        'absolute top-1.5 right-2 size-2 rounded-full bg-brand shadow-[0_0_0_2px_white]',
                        railOnly,
                      )}
                    />
                  </>
                )}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="mt-auto flex flex-col gap-0.5 border-t border-divider pt-4">
        {/* The public site is a separate root layout: Next does a full page load. */}
        <Link
          href={'/' as Route}
          title={tShell('viewSite')}
          className={cn(
            'flex h-[38px] items-center gap-2.5 rounded-sm px-3 text-small text-muted-ink no-underline hover:bg-surface',
            variant === 'responsive' && 'justify-center xl:justify-start',
            variant === 'rail' && 'justify-center',
          )}
        >
          <ExternalLink className="size-[18px] shrink-0" aria-hidden />
          <span className={wide}>{tShell('viewSite')}</span>
        </Link>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? tShell('expand') : tShell('collapse')}
            title={collapsed ? tShell('expand') : tShell('collapse')}
            className={cn(
              'hidden h-[38px] cursor-pointer items-center gap-2.5 rounded-sm px-3 text-small text-muted-ink hover:bg-surface xl:flex',
              collapsed && 'justify-center',
            )}
          >
            {collapsed ? (
              <ChevronsRight className="size-[18px]" aria-hidden />
            ) : (
              <ChevronsLeft className="size-[18px]" aria-hidden />
            )}
            <span className={wide}>{tShell('collapse')}</span>
          </button>
        )}
      </div>
    </nav>
  );
}

function Topbar({
  pathname,
  groups,
  user,
  signOutAction,
  onOpenMenu,
  pageCrumb,
}: {
  pathname: string;
  groups: AdminShellGroup[];
  user: AdminShellUser;
  signOutAction: () => Promise<void>;
  onOpenMenu: () => void;
  pageCrumb: string | null;
}) {
  const t = useTranslations('admin.shell');
  const tNav = useTranslations('admin.nav');
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  // Breadcrumbs from the sidebar entry that owns the current page.
  const section = groups
    .flatMap((g) => g.items)
    .find((item) => item.href !== '/admin' && isCurrent(pathname, item.href));
  // Pages outside the sidebar (e.g. /admin/design-system) show just "Admin".
  const current = section ? tNav(section.key) : pathname === '/admin' ? tNav('dashboard') : null;
  const crumbs: { label: string; href?: string }[] = [
    { label: t('admin'), href: '/admin' },
    ...(current ? [{ label: current, href: pageCrumb && section ? section.href : undefined }] : []),
    ...(pageCrumb ? [{ label: pageCrumb }] : []),
  ];

  const signOut = () =>
    startTransition(async () => {
      await signOutAction();
      router.replace('/admin/login');
      router.refresh();
    });

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-white px-3 md:h-15 md:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t('openMenu')}
        className="flex size-11 cursor-pointer items-center justify-center rounded-sm hover:bg-surface md:hidden"
      >
        <Menu className="size-6" aria-hidden />
      </button>
      <span className="flex items-center gap-2 md:hidden">
        <BrandLogo variant="red" height={30} alt="EESTEC LC Skopje" />
        <span className="inline-flex h-5 items-center rounded-[6px] bg-surface px-1.5 text-[11px] font-bold tracking-[0.06em] text-muted-ink">
          ADMIN
        </span>
      </span>

      <nav aria-label={t('breadcrumb')} className="hidden min-w-0 md:block">
        <ol className="flex items-center gap-2 text-[15px] text-muted-ink">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <li key={index} className="flex min-w-0 items-center gap-2">
                {last ? (
                  <span aria-current="page" className="truncate font-medium text-ink">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href as Route}
                    className="text-muted-ink no-underline hover:text-ink hover:underline"
                  >
                    {crumb.label}
                  </Link>
                )}
                {!last && <ChevronRight className="size-4 shrink-0" aria-hidden />}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t('account', { name: user.name, role: user.roleLabel })}
            className="flex cursor-pointer items-center gap-2.5 rounded-full p-1 pr-2 hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
          >
            <InitialsAvatar initials={user.initials} size={34} />
            <span className="hidden flex-col text-left leading-tight lg:flex">
              <span className="text-[15px] font-medium">{user.name}</span>
              <span className="text-[13px] text-muted-ink">{user.roleLabel}</span>
            </span>
            <ChevronDown className="hidden size-4 lg:block" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem asChild>
              <Link href={'/' as Route} className="no-underline">
                <ExternalLink aria-hidden />
                {t('viewSite')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut} disabled={pending}>
              <LogOut aria-hidden />
              {t('signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
