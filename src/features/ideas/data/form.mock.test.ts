import { createMockIdeaFormRepository } from './form.mock';
import { describeIdeaFormRepository } from './form.repository.contract';

describeIdeaFormRepository('mock', createMockIdeaFormRepository);
