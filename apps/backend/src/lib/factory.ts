import type { OpenAPIHandler } from "@orpc/openapi/fetch";
import type { RPCHandler } from "@orpc/server/fetch";
import cuid from "cuid";
import { Hono } from "hono";
import { requestId } from "hono/request-id";

import type { createDb } from "@salora/database";
import type { EmailQueueMessage } from "@salora/mailer";

import { registerEvents } from "@/events";
import type { Env } from "@/lib/env";
import type { Logger } from "@/lib/log";
import { createAuthMiddleware } from "@/middleware/auth";
import { createCorsMiddleware } from "@/middleware/cors";
import { drizzleMiddleware } from "@/middleware/drizzle";
import { createEnvMiddleware } from "@/middleware/env";
import { loggerMiddleware } from "@/middleware/log";
import { orpcMiddleware } from "@/middleware/orpc";
import { createBetterAuthRoutes } from "@/routes/auth";
import { createORPCRoutes } from "@/routes/orpc";
import { createTrpcRoutes } from "@/routes/trpc";
import { createScalarRoutes } from "@/routes/scalar";
import { createAuth } from "@salora/auth";

export interface AppBindings {
  Variables: {
    logger: Logger;
    env: Env;
    drizzle: ReturnType<typeof createDb>;
    corsChecked: boolean;
    auth: ReturnType<typeof createAuth>;
    orpcHandler: RPCHandler<any>;
    trpcHandler: any;
    openapiHandler: OpenAPIHandler<any>;
    emailQueue?: Queue<EmailQueueMessage>;
  };
}

export function createRouter() {
  return new Hono<AppBindings>();
}

export function createApp(env: Env) {
  const router = createRouter();

  // Register middleware
  router.use(createCorsMiddleware(env));
  router.use(createEnvMiddleware(env));
  router.use(
    requestId({
      generator: cuid,
    }),
  );
  router.use(loggerMiddleware);
  router.use(drizzleMiddleware);
  router.use(createAuthMiddleware(env));
  router.use(orpcMiddleware);

  // Register routes
  createBetterAuthRoutes(router);
  createTrpcRoutes(router);
  createORPCRoutes(router);
  createScalarRoutes(router);
  registerEvents(router);
  return router;
}
