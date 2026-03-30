import { z } from 'zod';
import { initTRPC, TRPCError } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import SuperJSON from '$lib/superjson';
import { schema } from '@salora/database';
import { eq, and } from 'drizzle-orm';

// 1. Zorg dat de SvelteKit context alles correct doorgeeft
export const createSvelteKitContext =
	(locals: App.Locals) => (opts: FetchCreateContextFnOptions) => {
		const headers = Object.fromEntries(opts.req.headers);
		const forwardedFor = headers['x-forwarded-for'] || headers['x-real-ip'];
		const ip = forwardedFor || locals.ip;
		const method = opts.req.method;
		const url = opts.req.url;

		const cacheSeconds = headers['x-cache-seconds']
			? Number(headers['x-cache-seconds'])
			: undefined;

		return {
			...locals, // Hier zitten 'db' en 'auth' in dankzij hooks.server.ts!
			req: opts.req,
			headers,
			ip,
			method,
			url,
			cacheSeconds
		};
	};

// Definieer het expliciete type van je tRPC context
export type Context = ReturnType<ReturnType<typeof createSvelteKitContext>>;

// 2. Gebruik de Context type in de tRPC initialisatie
const t = initTRPC.context<Context>().create({
	transformer: SuperJSON
});

export const router = t.router;
export const publicProcedure = t.procedure;

// 3. privateProcedure (Beveiligd voor medewerkers)
export const privateProcedure = t.procedure
	.input(
		z.object({
			organizationId: z.string().optional()
		})
	)
	.use(async (opts) => {
		const branchId = opts.input.organizationId;
		const headers = new Headers(opts.ctx.headers);

		// ✅ Haal auth en db uit de request-context (opts.ctx)
		const session = await opts.ctx.auth.api.getSession({
			headers: headers
		});

		if (!session) {
			throw new TRPCError({
				code: 'UNAUTHORIZED',
				message: 'you_need_to_be_authenticated'
			});
		}

		if (branchId) {
			const [foundMember] = await opts.ctx.db
				.select()
				.from(schema.member)
				.where(
					and(eq(schema.member.userId, session.user.id), eq(schema.member.organizationId, branchId))
				)
				.limit(1);

			if (!foundMember) {
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

// 4. portalProcedure (Voor klanten)
export const portalProcedure = t.procedure
	.input(z.object({ branchId: z.string() }))
	.use(async (opts) => {
		const headers = new Headers(opts.ctx.headers);

		// ✅ Haal auth uit de request-context
		const session = await opts.ctx.auth.api.getSession({
			headers: headers
		});

		if (!session) {
			return opts.next({
				ctx: {
					...opts.ctx,
					headers,
					session: null,
					customer: null
				}
			});
		}

		// ✅ Haal db uit de request-context
		const [foundCustomer] = await opts.ctx.db
			.select()
			.from(schema.customer)
			.where(eq(schema.customer.userId, session.user.id))
			.limit(1);

		return opts.next({
			ctx: {
				...opts.ctx,
				headers,
				customer: foundCustomer ?? null,
				session
			}
		});
	});
