import { readFile, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), "utf8");
const exists = async (file) => { try { await access(path.join(root, file), fsConstants.F_OK); return true; } catch { return false; } };
const checks = [];
async function check(name, fn) { await fn(); checks.push(name); }
await check("core pages and admin entrypoints exist", async () => {
  for (const file of ["src/app/page.tsx", "src/app/register/page.tsx", "src/app/login/page.tsx", "src/app/verification/page.tsx", "src/app/feed/page.tsx", "src/app/admin/page.tsx", "src/app/admin/login/page.tsx", "db/schema.sql"]) assert.equal(await exists(file), true, `${file} missing`);
});
await check("private community pages have server guards", async () => {
  assert.match(await read("src/app/feed/page.tsx"), /requireVerifiedPage/);
  assert.match(await read("src/app/profile/page.tsx"), /requireVerifiedPage/);
  assert.match(await read("src/app/settings/page.tsx"), /requireVerifiedPage/);
  assert.match(await read("src/app/notifications/page.tsx"), /requireVerifiedPage/);
  assert.match(await read("src/app/admin/page.tsx"), /requireAdminPage/);
  assert.match(await read("src/app/page.tsx"), /href="\/admin\/login"/);
});
await check("profile does not repeat a universal verification badge", async () => {
  assert.doesNotMatch(await read("src/components/ProfileClient.tsx"), /عضوية معتمدة/);
});
await check("feed API rejects unverified members", async () => {
  assert.match(await read("src/app/api/feed/route.ts"), /getApiUser\(\{ verified: true \}\)/);
});
await check("membership is encrypted and duplicate checked", async () => {
  const crypto = await read("src/lib/crypto.ts");
  const verify = await read("src/app/api/verification/route.ts");
  assert.match(crypto, /aes-256-gcm/);
  assert.match(crypto, /createHmac\("sha256"/);
  assert.match(verify, /membership_number_encrypted/);
  assert.match(verify, /membership_fingerprint/);
});
await check("admin login is separate and rate limited", async () => {
  const page = await read("src/app/admin/login/page.tsx");
  const api = await read("src/app/api/admin/login/route.ts");
  assert.match(page, /AuthForm mode="admin"/);
  assert.match(api, /loginBlocked/);
});
await check("sensitive documents are limited to admin/reviewer", async () => {
  assert.match(await read("src/app/api/admin/documents/[documentId]/route.ts"), /\["admin", "reviewer"\]/);
  assert.match(await read("src/app/api/admin/verifications/route.ts"), /\["admin", "reviewer"\]/);
});
await check("secrets stay out of git", async () => {
  const gitignore = await read(".gitignore");
  assert.match(gitignore, /\.env\.\*/);
  assert.match(gitignore, /!\.env\.example/);
  const env = await read(".env.example");
  assert.match(env, /REPLACE_WITH_64_HEX_CHARACTERS/);
  assert.match(env, /YOUR-ENDPOINT/);
  assert.match(env, /USER:PASSWORD/);
});
console.log(`AXIS static smoke checks: ${checks.length} passed`);
for (const name of checks) console.log(`✓ ${name}`);
