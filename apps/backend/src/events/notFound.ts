import { ORPCError } from '@orpc/server';

import type { createRouter } from '@/lib/factory';

export function registerNotFoundEvent(app: ReturnType<typeof createRouter>) {
  app.notFound(() => {
    throw new ORPCError('NOT_FOUND');
  });
}
