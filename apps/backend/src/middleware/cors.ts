import type { Env } from "@/lib/env";
import { cors } from "hono/cors";

export function createCorsMiddleware(env: Env) {
  const allowedOrigins = env.TRUSTED_IPS.map((o) => o.trim().replace(/\/$/, "")).filter(
    Boolean,
  );

  return cors({
    origin: (origin) => {
      // Server-to-server requests / Postman sturen soms geen Origin header mee
      if (!origin) return allowedOrigins[0] || "*";

      const cleanOrigin = origin.trim().replace(/\/$/, "");

      // In dev mode kun je altijd localhost toestaan als fallback
      if (
        allowedOrigins.includes(cleanOrigin) ||
        cleanOrigin.includes("localhost")
      ) {
        return cleanOrigin;
      }

      return null;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    // 2. Geef alle benodigde headers vrij voor Better-Auth en oRPC
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Cookie",
      "Set-Cookie",
      "Accept",
      "x-orpc-source",
    ],
    credentials: true, // Noodzakelijk voor Better-Auth cookies & sessions
    maxAge: 86400,
  });
}
