import { createMiddleware } from "hono/factory";
import type { AnyD1Database } from "drizzle-orm/d1";

import { createDb } from "@salora/database";

import { getDbBinding } from "@/lib/env";

import type { AppBindings } from "@/lib/factory";

/**
 * The D1 binding is stable for the lifetime of a Worker isolate, so the
 * drizzle client can be created once and reused instead of on every request.
 */
const dbCache = new WeakMap<AnyD1Database, ReturnType<typeof createDb>>();

export const drizzleMiddleware = createMiddleware<AppBindings>(
  async (c, next) => {
    const env = c.get("env");
    const d1 = getDbBinding(env);

    let db = dbCache.get(d1);
    if (!db) {
      db = createDb(d1);
      dbCache.set(d1, db);
    }

    c.set("drizzle", db);
    await next();
  },
);
