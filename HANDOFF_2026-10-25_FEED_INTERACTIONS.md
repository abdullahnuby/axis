# AXIS — تقرير تسليم تقني: Feed وSocial Interactions

**التاريخ:** 2026-10-25  
**النطاق:** إصلاح TypeScript build error المبلغ عنه، تحسين Feed المكتبي، ومشاركة المنشورات وردود التعليقات وإعجاباتها.

## ملخص التنفيذ

- `src/components/ProfileClient.tsx`: معالجة خطأ `Argument of type 'string' is not assignable ...` عند `badgeLabels.has(code)` بجعل فهرس الملصقات `Map<string, string>` وتأكيد أن المدخلات tuples.
- `src/app/globals.css`: تحسين عرض Feed على الشاشات المكتبية الواسعة، تخطيط وسيط لشاشات 1051–1159px، وتنسيقات ردود التعليقات وأزرار التفاعل.
- `src/components/FeedClient.tsx`: إضافة مشاركة Web Share/Clipboard مع رابط يشير إلى المنشور المقصود، عرض الردود المتداخلة، إعجاب التعليقات والردود، اختيار التعليق المستهدف للرد، وحذف التعليق مع الردود التابعة عند السماح.
- `src/app/api/feed/route.ts`: دعم قراءة منشور محدد عبر معامل `post` مع التحقق من UUID.
- `src/app/api/posts/[postId]/comments/route.ts`: قراءة/إنشاء التعليقات مع `parent_comment_id` والإحصاءات الخاصة بالإعجابات والإشعارات.
- `src/app/api/comments/[commentId]/like/route.ts`: endpoint جديد للتبديل بين الإعجاب وإلغاء الإعجاب بالتعليق أو الرد، مع اشتراط جلسة عضو موثّق وsame-origin.
- `src/lib/types.ts`, `db/schema.sql`: توسيع نوع التعليق وإضافة `parent_comment_id` و`comment_likes`.
- `db/migrations/20261025_comment_interactions.sql`: ترحيل idempotent للقاعدة القائمة لا يحذف التعليقات السابقة.
- `README.md`, `CHANGELOG.md`, `BUILD_STATUS.md`, `scripts/smoke-check.mjs`: تحديث التوثيق والاختبارات.

## التحقق والنتائج

| الأمر | النتيجة |
|---|---|
| `node scripts/smoke-check.mjs` | 18 فحصًا ناجحًا |
| `node scripts/pwa-check.mjs` | 8 فحوصات ناجحة |
| فحص `transpileModule` لـ TypeScript/TSX | 62 ملفًا، 0 أخطاء صياغة |
| `npm install --no-audit --no-fund --prefer-offline` | انتهى بمهلة 90 ثانية |
| `npm run typecheck` | لم يكتمل؛ Dependencies غير مثبّتة |
| `npm run build` | لم يكتمل؛ Dependencies غير مثبّتة |

## مخاطر/خطوات لازمة قبل الإنتاج

1. تطبيق ملف `db/migrations/20261025_comment_interactions.sql` على Neon بصلاحيات مالك/ترحيل قبل نشر API الجديدة.
2. دفع التعديلات إلى GitHub ومراجعة سجل `next build` في Vercel؛ إصلاح خطأ `Map.has` المحدد موجود، لكن البناء الإنتاجي لم يُؤكد محليًا.
3. اختبار المستخدمين فعليًا على Production: مشاركة منشور محدد، إضافة ردود متعددة المستويات، toggle likes، الإشعارات، وحذف التعليقات مع ردودها التابعة.
4. لا توجد أسرار قاعدة بيانات داخل ملفات الترحيل أو التقرير.

## ملاحظة النشر

هذا التقرير لا يدّعي دفع التعديلات أو تطبيقها على Neon. ملفات المصدر في هذه الحزمة هي مصدر التغيير، والموقع الحي لا يتغير إلا بعد تطبيق الترحيل ودفع الكود ونجاح نشر Vercel.
