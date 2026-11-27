import { trpcServer } from '@hono/trpc-server';

import type { createRouter } from '@/lib/factory';

import { appRouter } from './trpc/_router';
import { createContext } from '@/middleware/trpc';

export function createTrpcRoutes(
	app: ReturnType<typeof createRouter>,
	basePath = ''
) {
	const trpcHandler = trpcServer({
		endpoint: `${basePath}/trpc`,
		router: appRouter,
		createContext
	});

	app.use('/trpc', trpcHandler);
	app.use('/trpc/*', trpcHandler);
}
