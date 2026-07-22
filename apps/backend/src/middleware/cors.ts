import { cors } from "hono/cors";

export const corsMiddleware = cors({
	origin: [
		"http://localhost:5173",
		"http://localhost:8788",
		"http://localhost:3000",
	],
	allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
	credentials: true,
	maxAge: 86400,
});
