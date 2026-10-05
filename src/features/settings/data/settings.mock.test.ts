import { beforeEach } from 'vitest';

import { resetMockStore } from '@/shared/data/mock/store';

import { describeSettingsRepository } from './settings.repository.contract';
import { createMockSettingsRepository } from './settings.mock';

beforeEach(() => resetMockStore());

describeSettingsRepository('mock', createMockSettingsRepository);
