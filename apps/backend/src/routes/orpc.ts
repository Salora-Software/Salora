import type { createRouter } from "@/lib/factory";

export function createORPCRoutes(app: ReturnType<typeof createRouter>) {
  app.all("/orpc/*", async (c) => {
    const handler = c.get("orpcHandler");
    const result = await handler.handle(c.req.raw, {
      context: { var: c.var, req: c.req },
      prefix: "/orpc",
    });
    if (result.matched) return result.response;
    return c.notFound();
  });

  // New REST (OpenAPI) route
  app.all("/api/*", async (c) => {
    const handler = c.get("openapiHandler");
    const result = await handler.handle(c.req.raw, {
      context: { var: c.var, req: c.req },
      prefix: "/api",
    });
    if (result.matched) return result.response;
    return c.notFound();
  });
}
