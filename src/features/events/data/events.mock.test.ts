import { createMockEventsRepository } from './events.mock';
import { describeEventsRepository } from './events.repository.contract';

describeEventsRepository('mock', createMockEventsRepository);
