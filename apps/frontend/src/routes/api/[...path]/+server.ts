import { createApp } from '@backend/lib/factory';
import { parseEnv } from '@backend/lib/env';

import type { RequestHandler } from './$types';

/**
 * The Hono app (router, middleware, routes) is stateless and the bindings are
 * stable for a Worker isolate, so build it once instead of on every `/api/*`
 * request. This keeps route registration off the per-request CPU budget.
 */
let app: ReturnType<typeof createApp> | undefined;

const handler: RequestHandler = ({ request, platform }) => {
	const rawEnv = (platform?.env ?? {}) as Record<string, unknown>;

	if (!app) {
		app = createApp(parseEnv(rawEnv), { basePath: '/api' });
	}

	return app.fetch(request, rawEnv as never, platform?.ctx as never);
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
