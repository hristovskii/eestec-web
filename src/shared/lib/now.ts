import 'server-only';

import { env } from '../config/env';
import { resolveNow } from './clock';

/** Server "now". Call it only inside cached queries or dynamic code (Cache Components rule). */
export function now(): Date {
  return resolveNow(env.MOCK_NOW, env.DATA_SOURCE === 'mock');
}
