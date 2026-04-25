import { createMiddleware } from 'hono/factory';

import type { AppBindings } from '@/lib/factory';

export const expoOriginFixMiddleware = createMiddleware<AppBindings>(async (c, next) => {
  if (!c.get('corsChecked')) {
    throw new Error('Running expoOriginFixMiddleware before corsMiddleware');
  }

  const ExpoOrigin = c.req.header('expo-origin');
  if (ExpoOrigin) {
    c.req.raw.headers.set('origin', ExpoOrigin);
  }
  await next();
});
