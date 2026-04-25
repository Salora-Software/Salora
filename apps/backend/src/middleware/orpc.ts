import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { CORSPlugin } from "@orpc/server/plugins";
import { ZodSmartCoercionPlugin } from "@orpc/zod";
import { createMiddleware } from "hono/factory";

import { router } from "../routes/orpc/_router";

import type { AppBindings } from "@/lib/factory";

export const orpcHandler = new RPCHandler(router, {
  plugins: [new CORSPlugin(), new ZodSmartCoercionPlugin()],
  interceptors: [
    onError((error) => {
      console.error("oRPC Error:", error);
    }),
  ],
});

export const openapiHandler = new OpenAPIHandler(router, {
  plugins: [new CORSPlugin(), new ZodSmartCoercionPlugin()],
  // You might want similar interceptors/error handling here
});

export const orpcMiddleware = createMiddleware<AppBindings>(async (c, next) => {
  // Pass the handler through the Hono context
  c.set("orpcHandler", orpcHandler);
  c.set("openapiHandler", openapiHandler);

  await next();
});
