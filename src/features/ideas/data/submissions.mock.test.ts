import { createMockSubmissionsRepository } from './submissions.mock';
import { describeSubmissionsRepository } from './submissions.repository.contract';

describeSubmissionsRepository('mock', createMockSubmissionsRepository);
