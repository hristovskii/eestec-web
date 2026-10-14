import { createMockJoinRepository } from './join.mock';
import { describeJoinRepository } from './join.repository.contract';

describeJoinRepository('mock', createMockJoinRepository);
