import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema";
import * as relations from "./db/relations";

const drizzleSchema = { ...schema, ...relations };

export const db = drizzle<typeof drizzleSchema>({
  schema: drizzleSchema,
});
