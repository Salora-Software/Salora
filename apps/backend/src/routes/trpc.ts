import { trpcServer } from '@hono/trpc-server';

import type { createRouter } from '@/lib/factory';

import { appRouter } from './trpc/_router';
import { createContext } from '@/middleware/trpc';

const trpcHandler = trpcServer({
	endpoint: '/trpc',
	router: appRouter,
	createContext
});

export function createTrpcRoutes(app: ReturnType<typeof createRouter>) {
	app.use('/trpc', trpcHandler);
	app.use('/trpc/*', trpcHandler);
}
