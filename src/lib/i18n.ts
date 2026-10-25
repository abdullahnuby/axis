import { AR_MESSAGES } from "@/locales/ar";
import { EN_MESSAGES } from "@/locales/en";

export type Locale = "ar" | "en";

/**
 * Resolve one UI message from the active locale resource.
 * Pages stay shared: the locale changes their UI copy and document direction,
 * rather than sending users to a duplicated set of pages.
 */
export function getLocalizedText(value: string, locale: Locale): string {
  const trimmed = value.trim();
  if (!trimmed) return value;

  const messages = locale === "ar" ? AR_MESSAGES : EN_MESSAGES;
  const direct = messages[trimmed];
  if (direct !== undefined) return value.replace(trimmed, direct);

  // Arabic is the source locale; unknown Arabic copy remains readable instead
  // of being mangled or translated heuristically.
  if (locale === "ar") return value;

  let match = trimmed.match(/^(.+?)(?: \\| AXIS)+$/);
  if (match && EN_MESSAGES[match[1]]) {
    return value.replace(trimmed, EN_MESSAGES[match[1]] + " | AXIS");
  }

  match = trimmed.match(/^نتائج البحث عن «(.+)»$/);
  if (match) return value.replace(trimmed, "Search results for “" + match[1] + "”");

  match = trimmed.match(/^عضو منذ (.+)$/);
  if (match) return value.replace(trimmed, "Member since " + match[1]);

  match = trimmed.match(/^تخصصي: (.+)$/);
  if (match) return value.replace(trimmed, "My specialty: " + match[1]);

  match = trimmed.match(/^تخصص (.+)$/);
  if (match) return value.replace(trimmed, "Specialty: " + match[1]);

  match = trimmed.match(/^تخصص: (.+)$/);
  if (match) return value.replace(trimmed, "Specialty: " + match[1]);

  match = trimmed.match(/^أنشأها (.+)$/);
  if (match) return value.replace(trimmed, "Created by " + match[1]);

  match = trimmed.match(/^شارك منشور (.+)$/);
  if (match) return value.replace(trimmed, "Shared a post by " + match[1]);

  match = trimmed.match(/^مشاركات (.+)$/);
  if (match) return value.replace(trimmed, "Posts by " + match[1]);

  match = trimmed.match(/^منذ (\\d+)\\s*د$/);
  if (match) return value.replace(trimmed, match[1] + " min ago");

  match = trimmed.match(/^منذ (\\d+)\\s*س$/);
  if (match) return value.replace(trimmed, match[1] + " hr ago");

  match = trimmed.match(/^منذ (\\d+)\\s*يوم$/);
  if (match) return value.replace(trimmed, match[1] + " days ago");

  match = trimmed.match(/^(\\d+)\\s+أحرف على الأقل$/);
  if (match) return value.replace(trimmed, match[1] + " characters minimum");

  match = trimmed.match(/^حساب @(.+)$/);
  if (match) return value.replace(trimmed, "Account @" + match[1]);

  match = trimmed.match(/^التعليقات\\s*·\\s*(.*)$/);
  if (match) return value.replace(trimmed, "Comments · " + match[1]);

  match = trimmed.match(/^متأكد إنك عايز توقف حساب (.+)؟ هيتسجل خروجه من الجلسات الحالية\\.?$/);
  if (match) return value.replace(trimmed, "Suspend " + match[1] + "? They'll be signed out of all active sessions.");

  match = trimmed.match(/^ده إجراء فعلي: (.+)\\. مش هينفع التراجع عنه من لوحة البلاغات\\. متأكد؟$/);
  if (match) return value.replace(
    trimmed,
    "You're about to " + getLocalizedText(match[1], "en").toLowerCase() + ". This can't be undone from the report panel. Continue?",
  );

  return value;
}

/** Backwards-compatible name for existing callers that specifically need English copy. */
export function translateArabicText(value: string): string {
  return getLocalizedText(value, "en");
}

export function localizedConfirm(message: string): boolean {
  if (typeof window === "undefined") return false;
  const locale: Locale = document.documentElement.lang === "en" ? "en" : "ar";
  return window.confirm(getLocalizedText(message, locale));
}
