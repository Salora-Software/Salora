// src/lib/server/router.ts
import { z } from 'zod';
import { publicProcedure, router } from './context';
import { router as v1 } from './routers/v1/router';
import { router as v2 } from './routers/v2/_router';
import { router as appointment } from './routers/appointment/_router';
import { importScriptsRouter } from '../importscripts';

export const appRouter = router({
	ping: publicProcedure
		.input(z.void())
		.output(z.string())
		.query(async () => {
			return 'pong';
		}),
	v1: v1,
	v2: v2,
	appointment: appointment,
	importScripts: importScriptsRouter
});

export type AppRouter = typeof appRouter;
