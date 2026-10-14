// Lighthouse (mobile preset) on the production build: `pnpm build && pnpm lighthouse [filter]`.
// Starts `next start` on its own port with no flags (what ships in Phase 1) and the Chromium that
// Playwright installed, and writes a table to docs/reports/lighthouse.md. The target is 90 or more in
// every category on every page (docs/ARCHITECTURE.md §8, M13). Not part of CI: it is slow and noisy.
import { type ChildProcess, spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';

const PORT = 3200;
const DEBUG_PORT = 9223;
const ORIGIN = `http://localhost:${PORT}`;
const TARGET = 90;

const PAGES = [
  '/',
  '/events',
  '/events/robomac-2025',
  '/upcoming',
  '/upcoming/ai-at-the-edge',
  '/journey',
  '/join',
  '/partners',
  '/contact',
];
const PREFIXES = ['', '/en'];
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'] as const;

type Row = {
  path: string;
  scores: Record<(typeof CATEGORIES)[number], number>;
  lcp: string;
  cls: string;
  tbt: string;
};

async function waitForServer(server: ChildProcess) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error('next start stopped');
    try {
      if ((await fetch(ORIGIN)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('next start did not come up');
}

// An address, or part of one; `=/` is exactly the Macedonian home page.
const filter = process.argv[2] ?? '';
const matches = (path: string) => (filter.startsWith('=') ? path === filter.slice(1) : path.includes(filter));
// Phase 1 as it ships: the e2e flags are removed from the environment.
const { FEATURE_FLAGS: _flags, ENABLE_DEV_SURFACES: _surfaces, ...env } = process.env;
const server: ChildProcess = spawn('pnpm', ['exec', 'next', 'start', '--port', String(PORT)], {
  stdio: 'ignore',
  env,
});
const rows: Row[] = [];
try {
  await waitForServer(server);
  // Visit every page once first, so the first measurement doesn't pay for a cold server.
  for (const prefix of PREFIXES)
    for (const page of PAGES) await fetch(`${ORIGIN}${page === '/' ? prefix || '/' : `${prefix}${page}`}`);
  const browser = await chromium.launch({ args: [`--remote-debugging-port=${DEBUG_PORT}`] });
  try {
    for (const prefix of PREFIXES) {
      for (const page of PAGES) {
        const path = page === '/' ? prefix || '/' : `${prefix}${page}`;
        if (!matches(path)) continue;
        const result = await lighthouse(`${ORIGIN}${path}`, {
          port: DEBUG_PORT,
          output: 'json',
          logLevel: 'error',
          onlyCategories: [...CATEGORIES],
        });
        if (!result) throw new Error(`no result for ${path}`);
        const { categories, audits } = result.lhr;
        const row: Row = {
          path,
          scores: Object.fromEntries(
            CATEGORIES.map((key) => [key, Math.round((categories[key]?.score ?? 0) * 100)]),
          ) as Row['scores'],
          lcp: audits['largest-contentful-paint']?.displayValue ?? '',
          cls: audits['cumulative-layout-shift']?.displayValue ?? '',
          tbt: audits['total-blocking-time']?.displayValue ?? '',
        };
        rows.push(row);
        if (process.env.LH_DETAILS) {
          // What still costs points: failing audits, and the element that is the LCP.
          for (const audit of Object.values(audits)) {
            const shown =
              audit.score !== null && audit.score < 0.9 && audit.scoreDisplayMode !== 'notApplicable';
            if (shown) console.log(`    - ${audit.id} (${audit.score}) ${audit.displayValue ?? ''}`);
          }
          const consoleErrors = audits['errors-in-console']?.details as
            { items?: { description?: string; source?: string }[] } | undefined;
          for (const item of consoleErrors?.items ?? [])
            console.log('    console:', item.source, item.description);
          const shifts = audits['layout-shifts']?.details as
            { items?: { node?: { snippet?: string }; score?: number }[] } | undefined;
          for (const item of shifts?.items ?? [])
            console.log('    shift:', item.score?.toFixed(3), item.node?.snippet?.slice(0, 100));
          const breakdown = audits['lcp-breakdown-insight']?.details as
            { items?: { type?: string; nodeLabel?: string; snippet?: string }[] } | undefined;
          const node = breakdown?.items?.find((item) => item.type === 'node');
          console.log('    LCP element:', node?.nodeLabel ?? node?.snippet ?? 'n/a');
        }
        console.log(path, row.scores, row.lcp, row.cls, row.tbt);
      }
    }
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}

const date = new Date().toISOString().slice(0, 10);
const table = [
  '| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...rows.map(
    (row) =>
      `| \`${row.path}\` | ${CATEGORIES.map((key) => row.scores[key]).join(' | ')} | ${row.lcp} | ${row.cls} | ${row.tbt} |`,
  ),
].join('\n');
mkdirSync(new URL('../docs/reports/', import.meta.url), { recursive: true });
writeFileSync(
  new URL('../docs/reports/lighthouse.md', import.meta.url),
  `# Lighthouse (mobile)\n\nRun on ${date} against the production build with Phase 1 flags and mock data (\`pnpm lighthouse\`). Target: ${TARGET} or more in every category.\n\n${table}\n`,
);
const below = rows.filter((row) => CATEGORIES.some((key) => row.scores[key] < TARGET));
console.log(
  below.length ? `Below ${TARGET}: ${below.map((row) => row.path).join(', ')}` : `All pages ${TARGET}+`,
);
