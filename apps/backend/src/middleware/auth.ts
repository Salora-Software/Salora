import { createMiddleware } from "hono/factory";

import { createAuth } from "@salora/auth";
import type { DatabaseType } from "@salora/database";

import type { Env } from "@/lib/env";
import type { AppBindings, AuthInstance } from "@/lib/factory";

/**
 * Building a better-auth instance is comparatively cheap, but sharing one per
 * Worker isolate keeps route/plugin objects warm and lets better-auth's
 * in-memory rate limiter persist across requests.
 *
 * Keyed by drizzle instance (one per isolate) and `origin|basePath`, since the
 * auth instance embeds both.
 */
const authCache = new WeakMap<DatabaseType, Map<string, AuthInstance>>();

function getCachedAuth(
  db: DatabaseType,
  origin: string,
  trustedOrigins: string[],
  basePath: string,
): AuthInstance {
  let byKey = authCache.get(db);
  if (!byKey) {
    byKey = new Map();
    authCache.set(db, byKey);
  }

  const key = `${origin}|${basePath}`;
  let auth = byKey.get(key);
  if (!auth) {
    auth = createAuth(db, origin, trustedOrigins, { basePath });
    byKey.set(key, auth);
  }

  return auth;
}

export function createAuthMiddleware(env: Env, basePath = "") {
  return createMiddleware<AppBindings>(async (c, next) => {
    const url = new URL(c.req.url);
    const origin = url.origin;

    const auth = getCachedAuth(
      c.get("drizzle"),
      origin,
      env.TRUSTED_IPS,
      `${basePath}/auth`,
    );

    c.set("auth", auth);
    await next();
  });
}
