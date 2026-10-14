import { createMockJourneyRepository } from './journey.mock';
import { describeJourneyRepository } from './journey.repository.contract';

describeJourneyRepository('mock', createMockJourneyRepository);
