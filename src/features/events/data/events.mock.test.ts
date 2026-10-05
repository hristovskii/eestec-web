import { createMockEventsRepository, createMockEventTaxonomyRepository } from './events.mock';
import { describeEventsRepository, describeEventTaxonomyRepository } from './events.repository.contract';

describeEventsRepository('mock', createMockEventsRepository);
describeEventTaxonomyRepository('mock', () =>
  Promise.resolve({ events: createMockEventsRepository(), taxonomy: createMockEventTaxonomyRepository() }),
);
