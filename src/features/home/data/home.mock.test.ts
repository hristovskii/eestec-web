import { createMockHomeRepository } from './home.mock';
import { describeHomeRepository } from './home.repository.contract';

describeHomeRepository('mock', createMockHomeRepository);
