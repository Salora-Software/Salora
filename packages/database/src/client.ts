import { drizzle } from 'drizzle-orm/d1';
import postgres from 'postgres';
import * as schema from './db/schema';
import * as relations from './db/relations';

export const db = drizzle({ schema: { ...schema, ...relations } });
