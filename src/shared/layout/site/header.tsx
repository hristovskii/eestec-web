'use client';

import { ChevronDown, LogOut, Menu, PenLine, Shield, User, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import type { NavKey } from '@/shared/config/site';
import { Link, usePathname, useRouter } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/cn';
import { BrandLogo, type LogoAsset } from '@/shared/ui/brand-logo';
import { InitialsAvatar } from '@/shared/ui/cards';
import { Button } from '@/shared/ui/primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu';

import { LocaleSwitcher } from './locale-switcher';

/** What the header shows about the signed-in user (mapped from the auth session by the layout). */
export type HeaderAccount = { name: string; initials: string; headline: string; isAdmin: boolean };

export type HeaderNavItem = { key: NavKey; href: string };

type SiteHeaderProps = {
  items: HeaderNavItem[];
  /**
   * null: member accounts are off (Phase 1), so no "Log in" and no account menu.
   * A promise: resolved inside <Suspense> so the header shell stays prerendered.
   */
  account: Promise<HeaderAccount | null> | null;
  signOutAction: () => Promise<void>;
  /** White logo from Settings › Branding. */
  logo?: LogoAsset | null;
};

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

/**
 * Red sticky header (Header, HeaderStates). Full menu from 1280 px, hamburger below: with 8 items and
 * Macedonian labels the menu does not fit at 1024 px (the canvas collapses only under 1024).
 *
 * No <Suspense> around usePathname: every (site) route is static or has generateStaticParams, so the
 * pathname resolves during prerender. A boundary here made Next defer the whole header (a flash of the
 * fallback). A route with unknown dynamic params would fail the build loudly instead.
 */
export function SiteHeader({ items, account, signOutAction, logo }: SiteHeaderProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  // The mobile menu is open for the page it was opened on: navigating closes it.
  const [openOn, setOpenOn] = React.useState<string | null>(null);
  const open = openOn !== null && openOn === pathname;
  const setOpen = (next: boolean | ((current: boolean) => boolean)) =>
    setOpenOn((typeof next === 'function' ? next(open) : next) ? pathname : null);
  const menuId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpenOn(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-20 bg-brand text-white shadow-[0_1px_0_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex h-16 max-w-[calc(1200px+48px)] items-center gap-2 pr-3 pl-4 xl:h-18 xl:gap-6 xl:px-6">
        <Link
          href="/"
          aria-label={t('home')}
          className="flex shrink-0 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <BrandLogo
            variant="white"
            asset={logo}
            height={52}
            alt="EESTEC LC Skopje"
            priority
            className="h-[46px] w-auto xl:h-[52px]"
          />
        </Link>

        <nav aria-label={t('main')} className="ml-auto hidden xl:block">
          <ul className="flex items-center gap-0.5">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-10 items-center rounded-sm px-3 text-[15px] font-medium whitespace-nowrap no-underline',
                      'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white',
                      active ? 'bg-white text-brand-dark' : 'text-white hover:bg-white/15',
                    )}
                  >
                    {t(item.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto xl:ml-0">
          <LocaleSwitcher pathname={pathname} size="md" />
        </div>

        {account && (
          <React.Suspense fallback={<span className="hidden w-11 xl:block" />}>
            <DesktopAccount account={account} signOutAction={signOutAction} />
          </React.Suspense>
        )}

        {account && (
          <React.Suspense fallback={null}>
            <MobileAvatar account={account} />
          </React.Suspense>
        )}

        <button
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? t('closeMenu') : t('openMenu')}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm text-white xl:hidden',
            'focus-visible:outline-2 focus-visible:outline-white',
            open && 'bg-white/15',
          )}
        >
          {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
        </button>
      </div>

      {open && (
        <nav
          id={menuId}
          aria-label={t('main')}
          className="max-h-[calc(100dvh-64px)] overflow-y-auto bg-white px-4 pt-2 pb-6 text-ink shadow-[0_12px_24px_rgba(0,0,0,0.12)] xl:hidden"
        >
          {account && (
            <React.Suspense fallback={null}>
              <MobileAccountCard account={account} />
            </React.Suspense>
          )}
          <ul>
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.key} className="border-b border-divider">
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-13 items-center justify-between text-[18px] no-underline',
                      active ? 'font-bold text-brand-dark' : 'font-medium text-ink',
                    )}
                  >
                    {t(item.key)}
                    {active && <span aria-hidden className="size-2 rounded-full bg-brand" />}
                  </Link>
                </li>
              );
            })}
          </ul>
          {account && (
            <React.Suspense fallback={null}>
              <MobileAccountActions account={account} signOutAction={signOutAction} />
            </React.Suspense>
          )}
        </nav>
      )}
    </header>
  );
}

function useSignOut(signOutAction: () => Promise<void>) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const signOut = () =>
    startTransition(async () => {
      await signOutAction();
      router.refresh();
    });
  return { signOut, pending };
}

function DesktopAccount({
  account,
  signOutAction,
}: {
  account: Promise<HeaderAccount | null>;
  signOutAction: () => Promise<void>;
}) {
  const t = useTranslations('nav');
  const user = React.use(account);
  const { signOut } = useSignOut(signOutAction);

  if (!user) {
    return (
      <Link
        href="/login"
        className="hidden h-10 shrink-0 items-center gap-2 pr-1 pl-0.5 text-[15px] font-medium whitespace-nowrap text-white no-underline hover:underline focus-visible:outline-2 focus-visible:outline-white xl:flex"
      >
        <User className="size-5" aria-hidden />
        {t('login')}
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('accountMenu', { name: user.name })}
        className="hidden h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full pr-1.5 pl-1 text-white focus-visible:outline-2 focus-visible:outline-white data-[state=open]:bg-white/18 xl:flex"
      >
        <InitialsAvatar
          initials={user.initials}
          size={36}
          tone="white"
          className="shadow-[0_0_0_2px_rgba(255,255,255,0.6)]"
        />
        <ChevronDown className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-68">
        <div className="mb-1.5 flex items-center gap-3 border-b border-divider px-3 pt-2.5 pb-3.5">
          <InitialsAvatar initials={user.initials} size={40} tone="tint" />
          <span className="flex min-w-0 flex-col">
            <strong className="text-[15px]">{user.name}</strong>
            <span className="text-[13px] text-muted-ink">{user.headline}</span>
          </span>
        </div>
        <DropdownMenuItem asChild>
          <Link href="/profile" className="no-underline">
            <User aria-hidden />
            {t('myProfile')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/memories/new" className="no-underline">
            <PenLine aria-hidden />
            {t('createMemory')}
          </Link>
        </DropdownMenuItem>
        {user.isAdmin && (
          <DropdownMenuItem asChild>
            {/* /admin is a separate root layout: a full page load is intended. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/admin" className="no-underline">
              <Shield aria-hidden />
              {t('adminPanel')}
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogOut aria-hidden />
          {t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileAvatar({ account }: { account: Promise<HeaderAccount | null> }) {
  const t = useTranslations('nav');
  const user = React.use(account);
  if (!user) return null;
  return (
    <Link
      href="/profile"
      aria-label={t('myProfileOf', { name: user.name })}
      className="flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-white xl:hidden"
    >
      <InitialsAvatar
        initials={user.initials}
        size={34}
        tone="white"
        className="shadow-[0_0_0_2px_rgba(255,255,255,0.6)]"
      />
    </Link>
  );
}

function MobileAccountCard({ account }: { account: Promise<HeaderAccount | null> }) {
  const t = useTranslations('nav');
  const user = React.use(account);
  if (!user) return null;
  return (
    <div className="my-2 flex flex-col gap-1.5 rounded-md bg-surface p-3">
      <div className="flex items-center gap-3 px-1 pt-0.5 pb-2">
        <InitialsAvatar
          initials={user.initials}
          size={40}
          tone="tint"
          className="border border-line bg-white"
        />
        <span className="flex flex-col">
          <strong className="text-body">{user.name}</strong>
          <span className="text-[13px] text-muted-ink">{user.headline}</span>
        </span>
      </div>
      <div className="flex gap-2">
        <Button asChild variant="quiet" className="h-11 flex-1 text-[15px]">
          <Link href="/profile">{t('myProfile')}</Link>
        </Button>
        <Button asChild variant="quiet" className="h-11 flex-1 text-[15px]">
          <Link href="/memories/new">{t('createMemory')}</Link>
        </Button>
      </div>
      {user.isAdmin && (
        <Button asChild variant="quiet" className="h-11 text-[15px]">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/admin">
            <Shield aria-hidden />
            {t('adminPanel')}
          </a>
        </Button>
      )}
    </div>
  );
}

function MobileAccountActions({
  account,
  signOutAction,
}: {
  account: Promise<HeaderAccount | null>;
  signOutAction: () => Promise<void>;
}) {
  const t = useTranslations('nav');
  const user = React.use(account);
  const { signOut, pending } = useSignOut(signOutAction);

  if (user) {
    return (
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className="mt-4 flex h-11 cursor-pointer items-center gap-2.5 text-body font-medium text-ink"
      >
        <LogOut className="size-5" aria-hidden />
        {t('logout')}
      </button>
    );
  }
  return (
    <div className="mt-5 flex flex-col gap-2.5">
      <Button asChild block>
        <Link href="/join">{t('becomeMember')}</Link>
      </Button>
      <Button asChild variant="secondary" block>
        <Link href="/login">
          <User aria-hidden />
          {t('memberLogin')}
        </Link>
      </Button>
    </div>
  );
}
