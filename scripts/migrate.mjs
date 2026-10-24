import dotenv from "dotenv";
import { Client } from "pg";
import { readFile } from "node:fs/promises";

dotenv.config({ path: ".env.local" });
dotenv.config();
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL (or DATABASE_URL_UNPOOLED). Copy .env.example to .env.local and configure Neon first.");
  process.exit(1);
}
const client = new Client({ connectionString, connectionTimeoutMillis: 15000 });
try {
  await client.connect();
  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  await client.query(schema);
  console.log("AXIS schema applied successfully.");
} catch (error) {
  console.error("Database migration failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
