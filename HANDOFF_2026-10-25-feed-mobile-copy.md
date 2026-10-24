# تقرير التسليم — حذف Feed Hero وتحسين الموبايل ونبرة النصوص

**التاريخ:** 2026-10-25
**المشروع:** AXIS Next.js + Neon + PWA

## ملخص
- أزيلت كتلة الـ hero الكبيرة من صفحة `/feed`. يبدأ محتوى الديسكتوب بصندوق المشاركة مباشرة؛ واحتفظ مسار الموبايل بالفلاتر وصندوق المشاركة وشريط الفعاليات والمنشورات.
- زيدت قابلية القراءة على الهاتف عبر قواعد CSS نهائية تتجاوز التنسيقات المصغرة القديمة: متن المنشور 15.5px، نص التعليق 14.5px، حقول الإدخال 16px، الفلاتر/التفاعلات 12.5–13.5px، وعناصر التنقل السفلي 11.5px مع أهداف لمس أكبر.
- أعيدت صياغة الكلام المرئي للمستخدمين بنبرة اجتماعية ودودة من غير تغيير قواعد العضوية أو منطق APIs. شملت الصفحات/المكونات: `FeedClient`, `AppShell`, `AppHeader`, `ProfileClient`, `AuthForm`, `VerificationClient`, `NotificationsClient`, `SettingsClient`, الصفحة الرئيسية، صفحة المشاركات، metadata، وmanifest.
- أزيل مصطلح “الموجز” من نصوص الواجهة الفعلية واستُبدل بتسميات مناسبة للسياق مثل “الرئيسية” و“آخر المشاركات”. تمت تحديث `README.md` و`BUILD_STATUS.md` و`CHANGELOG.md`.
- أضيف regression test في `scripts/smoke-check.mjs` لمنع رجوع الـ hero أو المصطلح القديم في صفحات المجتمع.

## الفحوصات المنفذة
| الأمر | النتيجة |
|---|---|
| `node scripts/smoke-check.mjs` | 21 فحصًا ناجحًا |
| `node scripts/pwa-check.mjs` | 11 فحصًا ناجحًا |
| فحص تركيب TypeScript/TSX عبر TypeScript `transpileModule` | 62 ملفًا، 0 أخطاء صياغة |
| PostCSS parse لـ `src/app/globals.css` | ناجح |
| `npm install --no-audit --no-fund --ignore-scripts` | انتهى بمهلة بعد 70 ثانية |
| `npm run typecheck` / `npm run build` | لم يمكن التحقق — التبعيات غير مثبّتة |

## ملفات التعديل الأبرز
- `src/components/FeedClient.tsx` — إزالة hero وتحديث نصوص المشاركة والبحث والحالات الفارغة والتعليقات والتفاعل.
- `src/app/globals.css` — طبقة نهائية لقراءة الموبايل وتكبير اللمس.
- `src/components/AppShell.tsx`, `src/components/AppHeader.tsx` — تسميات التنقل والفعاليات والبحث.
- `src/components/ProfileClient.tsx`, `src/components/VerificationClient.tsx`, `src/components/NotificationsClient.tsx`, `src/components/SettingsClient.tsx`, `src/components/AuthForm.tsx` — مراجعة microcopy.
- `src/app/page.tsx`, `src/app/feed/page.tsx`, `src/app/layout.tsx`, `src/app/verification/page.tsx`, `src/app/api/feed/route.ts`, بعض API error strings، و`public/manifest.webmanifest`.
- `scripts/smoke-check.mjs`, `README.md`, `CHANGELOG.md`, `BUILD_STATUS.md`.

## حدود التسليم
- هذا ZIP هو مصدر المشروع المعدّل؛ لم يُدفع إلى GitHub ولم يُنشر على Vercel.
- لم يُؤكّد البناء الإنتاجي أو العرض عبر متصفح حقيقي بسبب تعذّر تنزيل حزم npm في بيئة التنفيذ. يجب تشغيل `npm install`, `npm run typecheck`, `npm run build` في Codespaces أو Vercel قبل اعتماد النشر.
