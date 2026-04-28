import type { createRouter } from "@/lib/factory";

export function createBetterAuthRoutes(app: ReturnType<typeof createRouter>) {
	app.on(["POST", "GET"], "/auth/*", (c) => {
		const auth = c.get("auth");
		return auth.handler(c.req.raw);
	});
}

