import { z } from 'zod';
import { router as createRouter, publicProcedure } from '../../../context';
import { createTrpcRedisLimiter, defaultFingerPrint } from '@trpc-limiter/redis';
import redis from '$lib/server/redis'; // Import the singleton Redis client
import { env } from '$lib/server/env';

const rateLimiter = createTrpcRedisLimiter({
	fingerprint: (ctx) => defaultFingerPrint(ctx.req) + 'protected',
	message: (hitInfo) => `too_many_requests`,
	max: 3,
	windowMs: 10_000,
	redisClient: redis
});
const protectedProcedure = publicProcedure.use(async (opts) => {
	if (!opts.ctx.ip || env.TRUSTED_IPS.includes(opts.ctx.ip.split(', ')[0])) {
		return opts.next();
	}
	return rateLimiter(opts);
});

export const router = createRouter({});
