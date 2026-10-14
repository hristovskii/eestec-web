import { createMockPartnersRepository } from './partners.mock';
import { describePartnersRepository } from './partners.repository.contract';

describePartnersRepository('mock', createMockPartnersRepository);
