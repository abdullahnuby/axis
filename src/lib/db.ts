import "server-only";
import { Pool, type QueryResult, type QueryResultRow, type PoolClient } from "pg";

const globalForPg = globalThis as unknown as { axisPgPool?: Pool };

/** Keep the TLS verification behavior explicit as pg-connection-string evolves. */
function normalizeDatabaseSslMode(connectionString: string): string {
  const url = new URL(connectionString);
  const mode = url.searchParams.get("sslmode")?.toLowerCase();
  if (mode && ["prefer", "require", "verify-ca"].includes(mode)) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured. Add your Neon pooled connection string to .env.local.");
  }
  if (!globalForPg.axisPgPool) {
    globalForPg.axisPgPool = new Pool({
      connectionString: normalizeDatabaseSslMode(process.env.DATABASE_URL),
      max: 2,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
    });
  }
  return globalForPg.axisPgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []): Promise<QueryResult<T>> {
  return getPool().query<T>(text, values);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
