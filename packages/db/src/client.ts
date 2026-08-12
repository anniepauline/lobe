import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://lobe:lobe@localhost:5434/lobe";

export const queryClient = postgres(databaseUrl, {
  max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
  prepare: false,
});

export const db = drizzle({ client: queryClient, schema });

export async function closeDatabase(): Promise<void> {
  await queryClient.end();
}
