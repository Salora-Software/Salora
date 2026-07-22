import { createMiddleware } from "hono/factory";

import { createDb } from "@salora/database";

import type { AppBindings } from "@/lib/factory";

export const drizzleMiddleware = createMiddleware<AppBindings>(
  async (c, next) => {
    const env = c.get("env");
    // eslint-disable-next-line ts/no-unsafe-assignment
    const d1 = env.DB;
    if (!d1) {
      // this will be handled by the hono error handler
      throw new Error(
        "D1 database instance not found in environment variables",
      );
    }

    // eslint-disable-next-line ts/no-unsafe-argument
    const db = createDb(d1);
    c.set("drizzle", db);
    await next();
  },
);
