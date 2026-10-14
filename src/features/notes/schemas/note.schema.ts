import { z } from 'zod';

import { NOTE_ENTITIES, NOTE_LIMITS } from '../types';

// Messages are keys of `admin.inbox.notes.errors`.
export const noteSchema = z.object({
  entityType: z.enum(NOTE_ENTITIES),
  entityId: z.string().regex(/^[\w-]{1,64}$/),
  body: z.string().trim().min(1, 'required').max(NOTE_LIMITS.body, 'tooLong'),
});
