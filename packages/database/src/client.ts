import { AnyD1Database, drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema";
import * as relations from "./db/relations";

const drizzleSchema = { ...schema, ...relations };

export const createDb = (d1Binding: AnyD1Database) => {
  return drizzle(d1Binding, {
    schema: drizzleSchema,
  });
};
