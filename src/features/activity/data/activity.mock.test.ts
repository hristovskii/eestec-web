import { beforeEach } from 'vitest';

import { resetMockStore } from '@/shared/data/mock/store';

import { createMockActivityRepository } from './activity.mock';
import { describeActivityRepository } from './activity.repository.contract';

beforeEach(() => resetMockStore());

describeActivityRepository('mock', createMockActivityRepository);
