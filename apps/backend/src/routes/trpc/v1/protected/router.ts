import { TRPCError } from '@trpc/server';
import { router as createRouter, publicProcedure } from '@/middleware/trpc';

export const protectedProcedure = publicProcedure.use(async (opts) => {
	const session = await opts.ctx.auth.api.getSession({
		headers: new Headers(opts.ctx.headers)
	});

	if (!session) {
		throw new TRPCError({
			code: 'UNAUTHORIZED',
			message: 'you_need_to_be_authenticated'
		});
	}

	return opts.next({
		ctx: {
			...opts.ctx,
			session
		}
	});
});

export const router = createRouter({});
