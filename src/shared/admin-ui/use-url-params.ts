'use client';

import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { hrefWithParams, type ParamsPatch } from '@/shared/lib/search-params';

/** Admin lists keep filters, sort and page in the URL. `pending` is true while the list reloads. */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const hrefWith = React.useCallback(
    (patch: ParamsPatch) => hrefWithParams(pathname, params.toString(), patch) as Route,
    [pathname, params],
  );
  const update = React.useCallback(
    (patch: ParamsPatch) => startTransition(() => router.replace(hrefWith(patch), { scroll: false })),
    [router, hrefWith],
  );

  return { params, hrefWith, update, pending };
}
