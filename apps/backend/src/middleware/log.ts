import { createMiddleware } from "hono/factory";

import type { AppBindings } from "@/lib/factory";
import { createLogger } from "@/lib/log";

export const loggerMiddleware = createMiddleware<AppBindings>(
  async (c, next) => {
    const logger = createLogger(c.var.env);
    const requestTime = Date.now();
    const reqId =
      c.req.header("cf-ray") || c.req.header("x-request-id") || c.var.requestId;
    const honoLogger = logger.child({
      requestId: reqId,
      path: c.req.path,
      method: c.req.method,
      requestTime,
    });
    c.set("logger", honoLogger);

    await next();

    c.res.headers.set("x-request-id", reqId);
    honoLogger.debug({
      responseTime: Date.now() - requestTime,
      statusCode: c.res.status,
    });
  },
);
