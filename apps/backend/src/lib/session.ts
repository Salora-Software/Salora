import type { Context } from "hono";

import type { AppBindings } from "@/lib/factory";

/**
 * Resolve the current session at most once per Hono request.
 *
 * Every protected tRPC/oRPC procedure would otherwise issue its own
 * `auth.api.getSession` call (a D1 `session JOIN user` query). Caching the
 * promise on the request context dedupes those lookups.
 */
export function getRequestSession(c: Context<AppBindings>) {
  const cached = c.get("session");
  if (cached) return cached;

  const session = c.get("auth").api.getSession({
    headers: c.req.raw.headers,
  });

  c.set("session", session);
  return session;
}

export type RequestSession = ReturnType<typeof getRequestSession>;
