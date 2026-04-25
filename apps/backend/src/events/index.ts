import { registerErrorEvent } from './error';
import { registerNotFoundEvent } from './notFound';

import type { createRouter } from '@/lib/factory';

export function registerEvents(app: ReturnType<typeof createRouter>) {
  registerErrorEvent(app);
  registerNotFoundEvent(app);
}
