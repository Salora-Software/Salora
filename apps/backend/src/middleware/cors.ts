import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';

import type { AppBindings } from '@/lib/factory';

export const corsMiddleware = createMiddleware<AppBindings>(async (c, next) => {
	const env = c.var.env;
	const url = new URL(c.req.url);
	const origin = url.origin;
	const builtInCors = cors({
		origin: origin,
		credentials: true,
		allowMethods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
		allowHeaders: ['Content-Type', 'Authorization'],
	});
	c.set('corsChecked', true);
	return builtInCors(c, next);
});
