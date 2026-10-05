import { describeDashboardRepository } from './dashboard.repository.contract';
import { createMockDashboardRepository } from './dashboard.mock';

describeDashboardRepository('mock', createMockDashboardRepository);
