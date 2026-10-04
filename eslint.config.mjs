import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import boundaries from 'eslint-plugin-boundaries';
import betterTailwind from 'eslint-plugin-better-tailwindcss';
import i18next from 'eslint-plugin-i18next';
import importX from 'eslint-plugin-import-x';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

const FEATURE_ENTRIES = '{index.ts,server.ts}';

export default defineConfig([
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'handoff/**',
    'specs/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
  ]),
  ...nextVitals,
  ...nextTs,

  // Type-aware TypeScript rules
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
  { files: ['**/*.{js,mjs}'], extends: [tseslint.configs.disableTypeChecked] },

  // Architecture: app → features → shared (docs/ARCHITECTURE.md §1, §6)
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries, 'import-x': importX },
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true } },
      'boundaries/elements': [
        { type: 'app-admin', pattern: 'src/app/admin' },
        { type: 'app', pattern: 'src/app' },
        { type: 'feature', pattern: 'src/features/*', capture: ['feature'] },
        { type: 'shared', pattern: 'src/shared' },
      ],
    },
    rules: {
      'import-x/no-cycle': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            { allow: { to: { module: { origin: 'external' } } } },
            { allow: { to: { module: { origin: 'core' } } } },
            // shared is domain-agnostic: it may only import shared.
            { from: { element: { type: 'shared' } }, allow: { to: { element: { type: 'shared' } } } },
            // A feature may use shared, itself, and other features' public entries only.
            {
              from: { element: { type: 'feature' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            {
              from: { element: { type: 'feature' } },
              allow: {
                to: {
                  element: { type: 'feature', captured: { feature: '{{ from.element.captured.feature }}' } },
                },
              },
            },
            {
              from: { element: { type: 'feature' } },
              allow: { to: { element: { type: 'feature', fileInternalPath: FEATURE_ENTRIES } } },
            },
            // A feature's admin code may use other features' admin entries (e.g. NotesPanel).
            {
              from: {
                element: {
                  type: 'feature',
                  fileInternalPath: '{admin.ts,components/admin/**,actions/admin/**}',
                },
              },
              allow: { to: { element: { type: 'feature', fileInternalPath: 'admin.ts' } } },
            },
            // Routes use shared and feature entries; only admin routes may use admin.ts.
            {
              from: { element: { types: { anyOf: ['app', 'app-admin'] } } },
              allow: { to: { element: { types: { anyOf: ['shared', 'app', 'app-admin'] } } } },
            },
            {
              from: { element: { types: { anyOf: ['app', 'app-admin'] } } },
              allow: { to: { element: { type: 'feature', fileInternalPath: FEATURE_ENTRIES } } },
            },
            {
              from: { element: { type: 'app-admin' } },
              allow: { to: { element: { type: 'feature', fileInternalPath: 'admin.ts' } } },
            },
          ],
        },
      ],
    },
  },

  // Public code uses the locale-aware navigation helpers.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/app/admin/**',
      'src/shared/i18n/**',
      'src/shared/layout/admin/**',
      'src/shared/admin-ui/**',
      'src/**/components/admin/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'next/link', message: 'Use Link from @/shared/i18n/navigation (locale-aware).' },
            {
              name: 'next/navigation',
              importNames: ['redirect', 'permanentRedirect', 'useRouter', 'usePathname'],
              message: 'Use the helpers from @/shared/i18n/navigation (locale-aware).',
            },
          ],
        },
      ],
    },
  },

  // No hard-coded UI copy: text goes through next-intl (board content comes from repositories).
  {
    files: ['src/features/**/*.tsx', 'src/shared/layout/**/*.tsx', 'src/app/**/*.tsx'],
    ignores: ['**/*.test.tsx'],
    plugins: { i18next },
    rules: { 'i18next/no-literal-string': ['error', { mode: 'jsx-text-only' }] },
  },

  // Palette: only theme classes; no arbitrary colours.
  {
    files: ['src/**/*.tsx'],
    plugins: { 'better-tailwindcss': betterTailwind },
    settings: { 'better-tailwindcss': { entryPoint: 'src/shared/styles/globals.css' } },
    rules: {
      'better-tailwindcss/no-unknown-classes': 'error',
      'better-tailwindcss/no-restricted-classes': [
        'error',
        {
          restrict: [
            {
              pattern:
                '^(.*:)?(bg|text|border|ring|fill|stroke|outline|decoration|from|to|via|shadow)-\\[#.*\\]$',
              message: 'Use a theme colour (docs/ARCHITECTURE.md §5): no arbitrary colours.',
            },
          ],
        },
      ],
    },
  },
]);
