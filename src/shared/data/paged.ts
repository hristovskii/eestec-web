export type Paged<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

/** Which page and which rows (`from`..`to`, inclusive) a page number means for `total` rows. Out-of-range pages clamp to the last page. */
export function pageWindow(total: number, page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const from = (current - 1) * pageSize;
  return { page: current, pageCount, from, to: from + pageSize - 1 };
}

/** In-memory pagination (mock repositories). Out-of-range pages clamp to the last page. */
export function paginate<T>(all: readonly T[], page: number, pageSize: number): Paged<T> {
  const window = pageWindow(all.length, page, pageSize);
  return {
    items: all.slice(window.from, window.to + 1),
    total: all.length,
    page: window.page,
    pageSize,
    pageCount: window.pageCount,
  };
}
