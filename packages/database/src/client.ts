import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./db/schema";
import * as relations from "./db/relations";
import { createClient } from "@libsql/client";

const client = createClient({ url: "file:./dev.db" });

const drizzleSchema = { ...schema, ...relations };

export const db = drizzle<typeof drizzleSchema>({
  client,
  schema: drizzleSchema,
});
