import { describeSettingsRepository } from './settings.repository.contract';
import { createMockSettingsRepository } from './settings.mock';

describeSettingsRepository('mock', createMockSettingsRepository);
