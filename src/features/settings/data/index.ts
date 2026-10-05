import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import type { SettingsRepository } from './settings.repository';
import { createMockSettingsRepository } from './settings.mock';

export const settingsRepository = () =>
  selectImplementation<SettingsRepository>('settings', { mock: createMockSettingsRepository });
