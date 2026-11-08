import { createMockMemoriesRepository } from './memories.mock';
import { describeMemoriesRepository } from './memories.repository.contract';

describeMemoriesRepository('mock', createMockMemoriesRepository);
