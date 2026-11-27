import { createMiddleware } from "hono/factory";

import { createDb } from "@salora/database";

import { getDbBinding } from "@/lib/env";

import type { AppBindings } from "@/lib/factory";

export const drizzleMiddleware = createMiddleware<AppBindings>(
  async (c, next) => {
    const env = c.get("env");
    const d1 = getDbBinding(env);

    const db = createDb(d1);
    c.set("drizzle", db);
    await next();
  },
);
