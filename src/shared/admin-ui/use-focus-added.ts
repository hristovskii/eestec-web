'use client';

import * as React from 'react';

/**
 * After adding a row to a list, moves focus to the first field of the new row once it is rendered:
 * `focusAdded(id)` before the update, with the row count (or the list) as the dependency.
 */
export function useFocusAdded(dependency: unknown) {
  const target = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!target.current) return;
    document.getElementById(target.current)?.focus();
    target.current = null;
  }, [dependency]);
  return (id: string) => void (target.current = id);
}
