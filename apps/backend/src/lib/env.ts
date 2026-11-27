import type { AnyD1Database } from "drizzle-orm/d1";
import type { EmailQueueMessage } from "@salora/mailer";
import { z } from "zod";

const envSchema = z.object({
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
    .default("info"),
  DB: z.any().optional(),
  DB_DEV: z.any().optional(),
  EMAIL_QUEUE: z.any().optional(),
  // todo: do we want a default value for this? Im scared of accidentally forgetting and deploying to prod with development env
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  TRUSTED_IPS: z
    .string()
    .transform((val) => val.split(",").map((ip) => ip.trim())),
});

export type Env = z.infer<typeof envSchema> & {
  DB?: AnyD1Database;
  DB_DEV?: AnyD1Database;
  EMAIL_QUEUE?: Queue<EmailQueueMessage>;
};

/**
 * Select the D1 binding based on the runtime environment.
 *
 * Development and preview deployments only bind `DB_DEV`, so a dev-configured
 * Worker can never accidentally read/write the production database.
 */
export function getDbBinding(env: Env): AnyD1Database {
  const isDev = env.NODE_ENV === "development";
  const db = isDev ? env.DB_DEV : env.DB;

  if (!db) {
    throw new Error(
      isDev
        ? "DB_DEV database instance not found: development environments must bind the dev D1 database as DB_DEV"
        : "DB database instance not found: production environments must bind the prod D1 database as DB",
    );
  }

  return db;
}

export function parseEnv(env: Record<string, unknown>): Env {
  const validated = envSchema.safeParse(env);

  if (!validated.success) {
    // we cant use logger here cause it will circular dep
    throw new Error(
      `Invalid environment variables:\n${validated.error.issues
        .map((i) => `${i.path.map(String).join(".")} - ${i.message}`)
        .join("\n")}`,
    );
  }

  return validated.data;
}
