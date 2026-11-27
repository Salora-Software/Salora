import { createApp } from '@backend/lib/factory';
import { parseEnv } from '@backend/lib/env';

import type { RequestHandler } from './$types';

const handler: RequestHandler = ({ request, platform }) => {
	const rawEnv = (platform?.env ?? {}) as Record<string, unknown>;
	const env = parseEnv(rawEnv);
	const app = createApp(env, { basePath: '/api' });

	return app.fetch(request, rawEnv as never, platform?.ctx as never);
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
