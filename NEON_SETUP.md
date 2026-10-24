# إعداد Neon الخاص بمشروع AXIS

تم إنشاء مشروع Neon للاستخدام مع AXIS وتهيئة مخطط قاعدة البيانات الأولي.

- **Project name:** `axis-engineering-community`
- **Project ID / slug:** `proud-bonus-83781735`
- **Region:** `aws-eu-central-1` (Frankfurt)
- **Default branch:** `main` (`br-quiet-cherry-bakrtjzb`)
- **PostgreSQL:** 18
- **Schema:** 12 tables + indexes + update triggers initialized.

لا يتضمن هذا المستند أي كلمة مرور أو connection string. من Neon Console اختر **Connect** لنسخ عنوان الاتصال.

## المتغيرات

- `DATABASE_URL`: عنوان pooled لدور التطبيق المحدود الصلاحيات، للاستخدام داخل Vercel.
- `DATABASE_URL_UNPOOLED`: عنوان direct لدور المالك، يستخدم محليًا لتطبيق `db/schema.sql` وإنشاء أول مسؤول. لا تستخدم دور المالك كاتصال التطبيق الدائم إذا أمكن تفادي ذلك.
- `DATA_ENCRYPTION_KEY`: مفتاح مستقل من 32 بايت (64 hex).
- `MEMBERSHIP_HMAC_KEY`: مفتاح مستقل آخر من 32 بايت (64 hex).
- `APP_URL`: رابط الإنتاج الكامل، مثل `https://<your-project>.vercel.app`.

## التحقق من قاعدة البيانات

المخطط يعرّف الجداول التالية: `users`, `sessions`, `login_attempts`, `verification_requests`, `verification_documents`, `posts`, `post_likes`, `comments`, `events`, `notifications`, `reports`, `audit_logs`.

لا يوجد حساب مدير ابتدائي حتى الآن. بعد وضع اتصال Neon في `.env.local`, شغّل `npm run admin:create` مع قيم `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_DISPLAY_NAME`, `ADMIN_PASSWORD`. هذا متعمد لتجنب نشر كلمة مرور افتراضية ثابتة.
