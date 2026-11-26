import type { createRouter } from "@/lib/factory";

export function createORPCRoutes(
  app: ReturnType<typeof createRouter>,
  basePath = "",
) {
  app.all("/orpc/*", async (c) => {
    const handler = c.get("orpcHandler");
    const result = await handler.handle(c.req.raw, {
      context: { var: c.var, req: c.req },
      prefix: `${basePath}/orpc` as `/${string}`,
    });
    if (result.matched) return result.response;
    return c.notFound();
  });

  // New REST (OpenAPI) route
  app.all("/rest/*", async (c) => {
    const handler = c.get("openapiHandler");
    const result = await handler.handle(c.req.raw, {
      context: { var: c.var, req: c.req },
      prefix: `${basePath}/rest` as `/${string}`,
    });
    if (result.matched) return result.response;
    return c.notFound();
  });
}
