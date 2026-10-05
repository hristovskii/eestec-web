import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import { createMockMediaRepository } from './media.mock';
import type { MediaRepository } from './media.repository';

export const mediaRepository = () =>
  selectImplementation<MediaRepository>('media', { mock: createMockMediaRepository }, 'session');
