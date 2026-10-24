import { randomBytes } from "node:crypto";
console.log("DATA_ENCRYPTION_KEY=" + randomBytes(32).toString("hex"));
console.log("MEMBERSHIP_HMAC_KEY=" + randomBytes(32).toString("hex"));
console.warn("Copy both values into your secret environment settings. Never commit them or reuse them for other purposes.");
