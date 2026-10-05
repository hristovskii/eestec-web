export type Paged<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

/** In-memory pagination (mock repositories). Out-of-range pages clamp to the last page. */
export function paginate<T>(all: readonly T[], page: number, pageSize: number): Paged<T> {
  const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * pageSize;
  return { items: all.slice(start, start + pageSize), total: all.length, page: current, pageSize, pageCount };
}
