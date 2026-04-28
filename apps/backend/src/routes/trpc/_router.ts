// src/lib/server/router.ts
import { z } from 'zod';
import { router as v1 } from './v1/router';
import { router as v2 } from './v2/_router';
import { publicProcedure } from '@/middleware/trpc';

export const appRouter = router({
	ping: publicProcedure
		.input(z.void())
		.output(z.string())
		.query(async () => {
			return 'pong';
		}),
	v1: v1,
	v2: v2,
});

export type AppRouter = typeof appRouter;
