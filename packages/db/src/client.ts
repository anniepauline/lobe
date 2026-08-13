import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let queryClient: ReturnType<typeof postgres> | null = null;
let database: Database | null = null;

// Connection is created on first use so importing this module (for types,
// or from skipped test suites) works without a configured DATABASE_URL.
function connect(): Database {
  if (database) return database;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required (Neon connection string).");
  }
  queryClient = postgres(databaseUrl, {
    max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    prepare: false,
  });
  database = drizzle({ client: queryClient, schema });
  return database;
}

export const db = new Proxy({} as Database, {
  get(_target, property) {
    return Reflect.get(connect(), property);
  },
});

export function getQueryClient(): ReturnType<typeof postgres> {
  connect();
  return queryClient!;
}

export async function pingDatabase(): Promise<void> {
  await getQueryClient()`select 1`;
}

export async function closeDatabase(): Promise<void> {
  await queryClient?.end();
  queryClient = null;
  database = null;
}
