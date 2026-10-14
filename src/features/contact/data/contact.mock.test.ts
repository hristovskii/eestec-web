import { createMockContactRepository } from './contact.mock';
import { describeContactRepository } from './contact.repository.contract';

describeContactRepository('mock', createMockContactRepository);
