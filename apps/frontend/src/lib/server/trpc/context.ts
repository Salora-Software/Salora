import { z } from 'zod';
// Helper to parse cookies from a cookie header string
function parseCookies(cookieHeader?: string): Record<string, string> {
	const cookies: Record<string, string> = {};
	if (!cookieHeader) return cookies;
	cookieHeader.split(';').forEach((cookie) => {
		const [name, ...rest] = cookie.split('=');
		if (name && rest.length > 0) {
			cookies[name.trim()] = rest.join('=').trim();
		}
	});
	return cookies;
}
import { initTRPC, TRPCError } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import SuperJSON from '$lib/superjson';
import { env } from '$lib/server/env';
import { auth } from '../auth';
import { prisma } from '../prisma';

const isWorkerTarget = process.env?.DEPLOY_TARGET === 'worker';

// Lazily load redis dependencies to avoid bundling for Workers
let redisLimiter: any = null;

(async () => {
	if (!isWorkerTarget) {
		try {
			const { createTrpcRedisLimiter, defaultFingerPrint } = await import('@trpc-limiter/redis');
			const redisModule = await import('../redis');
			const redisClient = redisModule.default;
			
			if (redisClient) {
				redisLimiter = createTrpcRedisLimiter({
					fingerprint: (ctx: any) => defaultFingerPrint(ctx.req),
					message: () => `too_many_requests`,
					max: 300,
					windowMs: 10_000,
					redisClient
				});
			}
		} catch (e) {
			console.warn('Redis limiter initialization failed, continuing without rate limiting');
		}
	}
})();

// Fix type to infer correct context
const t = initTRPC
	.context<typeof createSvelteKitContext extends (...args: any) => infer R ? R : never>()
	.create({
		transformer: SuperJSON
	});

export const createSvelteKitContext =
	(locals: App.Locals) => (opts: FetchCreateContextFnOptions) => {
		const headers = Object.fromEntries(opts.req.headers);
		// Try to get the real IP from headers (for production or proxy setups)
		const forwardedFor = headers['x-forwarded-for'] || headers['x-real-ip'];

		// Fallback to remoteAddress (in case of local requests)
		const ip = forwardedFor || locals.ip;

		// Log the request method and URL for debugging
		const method = opts.req.method;
		const url = opts.req.url;

		const cacheSeconds = headers['x-cache-seconds']
			? Number(headers['x-cache-seconds'])
			: undefined;
		return {
			...locals,
			req: opts.req,
			headers,
			ip,
			method,
			url,
			cacheSeconds
		};
	};
// Rate limiter will be initialized asynchronously above
export const router = t.router;
export const publicProcedure = t.procedure.use(async (opts) => {
	if (!opts.ctx.ip || env?.TRUSTED_IPS.includes(opts.ctx.ip.split(', ')[0])) {
		return opts.next();
	}

	if (!redisLimiter) {
		return opts.next();
	}

	return redisLimiter(opts);
});

export const privateProcedure = publicProcedure
	.input(
		z.object({
			organizationId: z.string().optional()
		})
	)
	.use(async (opts) => {
		const branchId = opts.input.organizationId;
		let headers = new Headers(opts.ctx.headers);

		const session = await auth.api.getSession({
			headers: headers
		});

		if (!session)
			throw new TRPCError({
				code: 'UNAUTHORIZED',
				message: 'you_need_to_be_authenticated_to_change_your_name'
			});
		if (branchId) {
			//check if user is part of the branch
			const member = await prisma.member.findFirst({
				where: {
					userId: session.user.id,
					organizationId: branchId
				}
			});
			if (!member) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'not_a_member_of_organization'
				});
			}
		}
		return opts.next({
			ctx: {
				...opts.ctx,
				session,
				headers
			}
		});
	});

export const portalProcedure = t.procedure
	.input(z.object({ branchId: z.string() }))
	.use(async (opts) => {
		let headers = new Headers(opts.ctx.headers);
		const session = await auth.api.getSession({
			headers: headers
		});
		if (!session)
			return opts.next({
				ctx: {
					...opts.ctx,
					headers,
					session: null,
					customer: null
				}
			});
		const customer = await prisma.customer.findFirst({
			where: {
				user: {
					id: session.user.id
				}
			}
		});

		return opts.next({
			ctx: {
				...opts.ctx,
				headers,
				customer,
				session
			}
		});
	});

// Export types for use in handlers
export type PortalProcedureContext = {
	headers: Headers;
	session: Awaited<ReturnType<typeof auth.api.getSession>> | null;
	customer: {
		id: string;
		name: string;
		createdAt: Date;
		phone: string | null;
		email: string;
		organizationId: string;
		userId: string | null;
		authToken: string | null;
		address: string | null;
	} | null;
	req: Request;
	ip: string | undefined;
	method: string;
	url: string;
	cacheSeconds?: number;
};
