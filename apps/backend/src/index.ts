import type { ExecutionContext } from 'hono';

import { parseEnv } from '@/lib/env';
import { createApp } from '@/lib/factory';

export default {
  async fetch(request: Request, env: Record<string, string>, ctx: ExecutionContext) {
    const parsedEnv = parseEnv(env);
    const app = createApp(parsedEnv);

    app.get('/hello', () => {
      throw new Error('kapoet');
    });

    return app.fetch(request, env, ctx);
  },
};
