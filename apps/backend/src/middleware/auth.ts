import { createMiddleware } from "hono/factory";

import type { Env } from "@/lib/env";
import type { AppBindings } from "@/lib/factory";
import { createAuth } from "@salora/auth";

export function createAuthMiddleware(env: Env) {
  return createMiddleware<AppBindings>(async (c, next) => {
    const url = new URL(c.req.url);
    const origin = url.origin;
    const auth = createAuth(env.DB, origin);
    c.set("auth", auth);
    await next();
  });
}
