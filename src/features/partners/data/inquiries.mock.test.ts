import { createMockInquiriesRepository } from './inquiries.mock';
import { describeInquiriesRepository } from './inquiries.repository.contract';

describeInquiriesRepository('mock', createMockInquiriesRepository);
