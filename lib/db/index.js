import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

const globalForDb = globalThis;

const pool = globalForDb.bid265Pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.bid265Pool = pool;
}

export const db = drizzle(pool, { schema });