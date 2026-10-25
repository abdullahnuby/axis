import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getApiUser, jsonError, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";

type UiPreferences = {
  compactMode: boolean;
  reduceMotion: boolean;
};

const DEFAULT_PREFERENCES: UiPreferences = {
  compactMode: false,
  reduceMotion: false,
};

function normalizePreferences(value: unknown): UiPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_PREFERENCES;
  const source = value as Record<string, unknown>;
  return {
    compactMode: source.compactMode === true,
    reduceMotion: source.reduceMotion === true,
  };
}

function noStoreJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", Vary: "Cookie" },
  });
}

export async function GET() {
  const { user, response } = await getApiUser();
  if (response) return response;

  try {
    const result = await query<{ preferred_locale: string; ui_preferences: unknown }>(
      "SELECT preferred_locale, ui_preferences FROM users WHERE id=$1 LIMIT 1",
      [user!.id],
    );
    const row = result.rows[0];
    if (!row) return jsonError("الحساب غير موجود.", 404);
    return noStoreJson({
      locale: row.preferred_locale === "en" ? "en" : "ar",
      preferences: normalizePreferences(row.ui_preferences),
    });
  } catch (error) {
    console.error("AXIS account preferences read failed", (error as { code?: string })?.code || "database_error");
    return jsonError("ما قدرناش نحمّل إعدادات حسابك دلوقتي.", 500);
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير صالح.", 403);
  const { user, response } = await getApiUser();
  if (response) return response;

  let input: Record<string, unknown>;
  try {
    input = await request.json() as Record<string, unknown>;
  } catch {
    return jsonError("بيانات الإعدادات غير صالحة.");
  }

  const hasLocale = Object.prototype.hasOwnProperty.call(input, "locale");
  const hasPreferences = Object.prototype.hasOwnProperty.call(input, "preferences");
  if (!hasLocale && !hasPreferences) return jsonError("مافيش إعدادات جديدة للحفظ.");
  if (hasLocale && input.locale !== "ar" && input.locale !== "en") {
    return jsonError("اختار العربية أو الإنجليزية.");
  }

  let submittedPreferences: Record<string, unknown> = {};
  if (hasPreferences) {
    if (!input.preferences || typeof input.preferences !== "object" || Array.isArray(input.preferences)) {
      return jsonError("تفضيلات العرض غير صالحة.");
    }
    submittedPreferences = input.preferences as Record<string, unknown>;
    for (const key of ["compactMode", "reduceMotion"]) {
      if (Object.prototype.hasOwnProperty.call(submittedPreferences, key) && typeof submittedPreferences[key] !== "boolean") {
        return jsonError("أحد خيارات العرض غير صالح.");
      }
    }
  }

  try {
    const current = await query<{ preferred_locale: string; ui_preferences: unknown }>(
      "SELECT preferred_locale, ui_preferences FROM users WHERE id=$1 LIMIT 1",
      [user!.id],
    );
    if (!current.rows[0]) return jsonError("الحساب غير موجود.", 404);
    const previous = normalizePreferences(current.rows[0].ui_preferences);
    const preferences: UiPreferences = {
      compactMode: typeof submittedPreferences.compactMode === "boolean" ? submittedPreferences.compactMode : previous.compactMode,
      reduceMotion: typeof submittedPreferences.reduceMotion === "boolean" ? submittedPreferences.reduceMotion : previous.reduceMotion,
    };
    const locale = hasLocale ? input.locale as "ar" | "en" : current.rows[0].preferred_locale === "en" ? "en" : "ar";

    await query(
      "UPDATE users SET preferred_locale=$1, ui_preferences=$2::jsonb, updated_at=now() WHERE id=$3",
      [locale, JSON.stringify(preferences), user!.id],
    );

    return noStoreJson({ ok: true, locale, preferences });
  } catch (error) {
    console.error("AXIS account preferences update failed", (error as { code?: string })?.code || "database_error");
    return jsonError("ما قدرناش نحفظ إعداداتك دلوقتي. جرّب تاني.", 500);
  }
}
