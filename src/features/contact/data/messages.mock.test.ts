import { createMockMessagesRepository } from './messages.mock';
import { describeMessagesRepository } from './messages.repository.contract';

describeMessagesRepository('mock', createMockMessagesRepository);
