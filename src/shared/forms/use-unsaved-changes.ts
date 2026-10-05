'use client';

import type { Route } from 'next';
// The pending href comes from the clicked link, so it already has its locale prefix: the plain
// router is right here, also on the public site (Memory editor).
// eslint-disable-next-line no-restricted-imports
import { useRouter } from 'next/navigation';
import * as React from 'react';

/**
 * While `dirty`, leaving the page asks first (AdminDialogs › Leaving with unsaved changes):
 * - in-app links are intercepted and open the dialog (`pendingHref` holds where they lead);
 * - closing or reloading the tab shows the browser's own warning.
 * The browser back button can't be intercepted reliably in the App Router and is not covered.
 */
export function useUnsavedChanges(dirty: boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    // Capture phase on document: runs before Next's <Link> handler and stops it.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page (hash links such as the error summary): no navigation.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(url.pathname + url.search + url.hash);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);

  return {
    /** Props for <UnsavedChangesDialog>. */
    open: pendingHref !== null,
    pendingHref,
    stay: () => setPendingHref(null),
    /** Leave now (after discarding or saving). */
    leave: () => {
      const href = pendingHref;
      setPendingHref(null);
      if (href) router.push(href as Route);
    },
  };
}
