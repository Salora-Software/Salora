import { Env } from "@/lib/env";
import { cors } from "hono/cors";

export function createCorsMiddleware(env: Env) {
  const allowedOrigins = env.TRUSTED_IPS;

  return cors({
    origin: (origin) => {
      if (allowedOrigins.includes(origin)) {
        return origin;
      }
      return null;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true, // Zorgt voor Access-Control-Allow-Credentials: true
    maxAge: 86400,
  });
}
