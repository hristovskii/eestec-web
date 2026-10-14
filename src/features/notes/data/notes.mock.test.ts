import { createMockNotesRepository } from './notes.mock';
import { describeNotesRepository } from './notes.repository.contract';

describeNotesRepository('mock', createMockNotesRepository);
