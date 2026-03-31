import { drizzle } from "drizzle-orm/d1";
import type { AnyD1Database } from "drizzle-orm/d1";
import * as schema from "./db/schema";
import * as relations from "./db/relations";

export const drizzleSchema = { ...schema, ...relations };

export const createDb = (d1Binding: AnyD1Database) => {
  return drizzle(d1Binding, {
    schema: drizzleSchema,
  });
};
