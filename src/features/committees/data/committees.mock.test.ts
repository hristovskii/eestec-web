import { createMockCommitteesRepository } from './committees.mock';
import { describeCommitteesRepository } from './committees.repository.contract';

describeCommitteesRepository('mock', createMockCommitteesRepository);
