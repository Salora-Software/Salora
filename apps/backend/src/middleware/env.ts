import { createMiddleware } from 'hono/factory';

import type { Env } from '@/lib/env';
import type { AppBindings } from '@/lib/factory';

export function createEnvMiddleware(env: Env) {
  return createMiddleware<AppBindings>(async (c, next) => {
    c.set('env', env);
    await next();
  });
}
