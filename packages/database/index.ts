import { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzleSchema } from "./src/client";

export * from "./src/client";
export * as schema from "./src/db/schema";
export * from "./src/db/booking-fields";

export type DatabaseType = DrizzleD1Database<typeof drizzleSchema>;
