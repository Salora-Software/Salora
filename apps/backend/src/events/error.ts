import { ORPCError } from '@orpc/server';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import type { createRouter } from '@/lib/factory';

export function registerErrorEvent(app: ReturnType<typeof createRouter>) {
  app.onError((err, c) => {
    c.get('logger').error({
      error: err.message,
      catcher: 'hono',
    });

    // defined on the ORPCError type means that we are expecting the error, and it isnt unexpectedly catched somewhere

    if (err instanceof ORPCError) {
      return c.json({
        defined: true,
        code: err.code as string,
        status: err.status,
        message: err.message,
      }, err.status as ContentfulStatusCode);
    }

    if (c.var.env.NODE_ENV === 'development') {
      return c.json({
        defined: false,
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
        message: err.message,
      }, 500);
    }
    else {
      return c.json({
        defined: false,
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
        message: 'An unexpected error occurred',
      });
    }
  });
}
