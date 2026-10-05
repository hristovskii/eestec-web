import 'server-only';

// In-memory tables for mock repositories (docs/ARCHITECTURE.md §4.2). They live on globalThis so
// they survive hot reloads, start from the feature's fixtures, and can be reset from devtools.
// On Vercel each server instance has its own copy and restarts from the fixtures.

type Store = Map<string, unknown>;
type Seeds = Map<string, () => unknown>;

const globalForMock = globalThis as unknown as { __mockStore?: Store; __mockSeeds?: Seeds };
const store: Store = (globalForMock.__mockStore ??= new Map<string, unknown>());
const seeds: Seeds = (globalForMock.__mockSeeds ??= new Map<string, () => unknown>());

/** A mutable mock table, seeded once from `seed` (a deep copy, so fixtures are never mutated). */
export function mockTable<T>(name: string, seed: () => T): T {
  seeds.set(name, () => structuredClone(seed()));
  if (!store.has(name)) store.set(name, structuredClone(seed()));
  return store.get(name) as T;
}

/** Restores every mock table to its fixtures (devtools "Reset sample data"). */
export function resetMockStore(): void {
  for (const [name, seed] of seeds) store.set(name, seed());
}
