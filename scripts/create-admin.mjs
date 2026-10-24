import dotenv from "dotenv";
import { Client } from "pg";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

dotenv.config({ path: ".env.local" });
dotenv.config();
const scrypt = promisify(scryptCallback);
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
const displayName = process.env.ADMIN_DISPLAY_NAME?.trim();
const password = process.env.ADMIN_PASSWORD;
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString || !email || !username || !displayName || !password) {
  console.error("Set DATABASE_URL and ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_DISPLAY_NAME, ADMIN_PASSWORD in your shell or .env.local.");
  process.exit(1);
}
if (password.length < 12) {
  console.error("ADMIN_PASSWORD must be at least 12 characters.");
  process.exit(1);
}
const salt = randomBytes(16);
const key = await scrypt(password, salt, 64);
const passwordHash = `scrypt$${salt.toString("hex")}$${Buffer.from(key).toString("hex")}`;
const client = new Client({ connectionString, connectionTimeoutMillis: 15000 });
try {
  await client.connect();
  const result = await client.query(
    `INSERT INTO users (email, username, display_name, password_hash, role, verification_status, account_status)
     VALUES ($1,$2,$3,$4,'admin','verified','active')
     ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username, display_name = EXCLUDED.display_name,
       password_hash = EXCLUDED.password_hash, role = 'admin', verification_status = 'verified',
       account_status = 'active', updated_at = now()
     RETURNING email, username, role`,
    [email, username, displayName, passwordHash],
  );
  console.log(`Admin account ready: ${result.rows[0].email} (@${result.rows[0].username}).`);
  console.log("Open /admin/login after deploying. No password was printed.");
} catch (error) {
  console.error("Could not create admin:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
