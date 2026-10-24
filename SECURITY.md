# Security Notes for AXIS

- Never commit `.env.local`, `.env`, database URLs, or encryption keys.
- Keep `DATA_ENCRYPTION_KEY` and `MEMBERSHIP_HMAC_KEY` separate, secret, and backed up securely. Losing either key affects access to existing encrypted data / duplicate-prevention continuity.
- Verification evidence is sensitive. Only admin/reviewer roles can read documents or see decrypted membership numbers; member-facing profile APIs must never return these fields.
- The main feed, member profiles, posts, comments, likes, notifications, events, and image endpoints require a verified session server-side; client-side hiding alone is not a security control.
- Use HTTPS in production, secure environment variables, and a least-privilege Neon role when configuring credentials. A dedicated application role is preferable to a database owner role for the deployed app; use the owner/direct URL only for migrations.
- Admin creation is CLI-only. Do not add a public admin-bootstrap endpoint.
- Before production with real users, add email verification/password reset, privacy/data retention policy, backup/restore tests, monitoring, and independent security review.
