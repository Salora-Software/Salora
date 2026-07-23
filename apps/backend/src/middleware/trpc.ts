import { z } from "zod";
import {
  initTRPC,
  TRPCError,
  type inferProcedureBuilderResolverOptions,
} from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { Context as HonoContext } from "hono";
import SuperJSON from "../lib/superjson";
import { schema } from "@salora/database";
import { eq, and } from "drizzle-orm";
import pino from "pino";
import type { AppBindings } from "@/lib/factory";

const logger = pino({ browser: { asObject: true } });

// 1. Context bouwen op basis van Hono i.p.v. SvelteKit locals
export const createContext = (
  opts: FetchCreateContextFnOptions,
  c: HonoContext<AppBindings>,
) => {
  const headers = Object.fromEntries(opts.req.headers);
  const forwardedFor = headers["x-forwarded-for"] || headers["x-real-ip"];

  // Fallback naar Cloudflare's specifieke IP header als je op Workers zit
  const ip = forwardedFor || c.req.header("cf-connecting-ip");

  const cacheSeconds = headers["x-cache-seconds"]
    ? Number(headers["x-cache-seconds"])
    : undefined;
  return {
    req: opts.req,
    headers,
    ip,
    method: opts.req.method,
    url: opts.req.url,
    cacheSeconds,
    db: c.get("drizzle"),
    auth: c.get("auth"),
  };
};

export type TrpcContext = Awaited<ReturnType<typeof createContext>>;

// 2. tRPC init met de nieuwe context
const t = initTRPC.context<TrpcContext>().create({
  transformer: SuperJSON,
});

const loggerMiddleware = t.middleware(async (opts) => {
  const start = Date.now();
  const result = await opts.next();
  const durationMs = Date.now() - start;

  const logData = {
    path: opts.path,
    type: opts.type,
    durationMs,
  };

  if (result.ok) {
    logger.info(logData, `request to ${opts.path} took ${durationMs}ms`);
  } else {
    logger.error(
      { ...logData, error: result.error },
      `request to ${opts.path} failed after ${durationMs}ms`,
    );
  }

  return result;
});

export const router = t.router;
export const publicProcedure = t.procedure.use(loggerMiddleware);

// 3. privateProcedure
export const privateProcedure = publicProcedure
  .input(
    z.object({
      organizationId: z.string().optional(),
    }),
  )
  .use(async (opts) => {
    const branchId = opts.input.organizationId;
    const headers = new Headers(opts.ctx.headers);

    const session = await opts.ctx.auth.api.getSession({
      headers: headers,
    });

    if (!session) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "you_need_to_be_authenticated",
      });
    }

    if (branchId) {
      const [foundMember] = await opts.ctx.db
        .select()
        .from(schema.member)
        .where(
          and(
            eq(schema.member.userId, session.user.id),
            eq(schema.member.organizationId, branchId),
          ),
        )
        .limit(1);

      if (!foundMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "not_a_member_of_organization",
        });
      }
    }

    return opts.next({
      ctx: {
        ...opts.ctx,
        session,
        headers,
      },
    });
  });

// 4. portalProcedure
export const portalProcedure = publicProcedure
  .input(z.object({ branchId: z.string() }))
  .use(async (opts) => {
    const headers = new Headers(opts.ctx.headers);

    const session = await opts.ctx.auth.api.getSession({
      headers: headers,
    });

    if (!session) {
      return opts.next({
        ctx: {
          ...opts.ctx,
          headers,
          session: null,
          customer: null,
        },
      });
    }

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
        session,
      },
    });
  });

export type PrivateContext = inferProcedureBuilderResolverOptions<
  typeof privateProcedure
>["ctx"];
export type PortalContext = inferProcedureBuilderResolverOptions<
  typeof portalProcedure
>["ctx"];
