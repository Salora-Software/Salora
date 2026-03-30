import { router as createRouter, publicProcedure } from '../../../context';

export const protectedProcedure = publicProcedure.use(async (opts) => {
	return opts.next();
});

export const router = createRouter({});
