import type { UserConfig } from '@commitlint/types';

// Scopes: feature names + cross-cutting areas (see docs/ARCHITECTURE.md §6).
const scopes = [
  'settings',
  'media',
  'auth',
  'admin-users',
  'events',
  'applications',
  'home',
  'committees',
  'journey',
  'join',
  'partners',
  'contact',
  'notes',
  'activity',
  'dashboard',
  'approvals',
  'members',
  'memories',
  'ideas',
  'devtools',
  'app',
  'ui',
  'admin-ui',
  'layout',
  'i18n',
  'data',
  'config',
  'deps',
  'e2e',
  'docs',
  'ci',
];

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', scopes],
    'body-max-line-length': [0],
  },
};

export default config;
