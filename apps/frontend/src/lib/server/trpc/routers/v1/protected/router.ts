import { z } from 'zod';
import { router as createRouter, publicProcedure } from '../../../context';
import { createTrpcRedisLimiter, defaultFingerPrint } from '@trpc-limiter/redis';
import { TRUSTED_IPS } from '$env/static/private';

export const protectedProcedure = publicProcedure.use(async (opts) => {
	return opts.next();
});

export const router = createRouter({});
