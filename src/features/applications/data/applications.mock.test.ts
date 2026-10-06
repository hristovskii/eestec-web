import { createMockApplicationsRepository } from './applications.mock';
import { describeApplicationsRepository } from './applications.repository.contract';

describeApplicationsRepository('mock', createMockApplicationsRepository);
