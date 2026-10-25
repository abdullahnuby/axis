import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [dictionarySource, languageProvider, feed, messages, groupDetail, groupComments, groups, people, profile, publicProfile, avatar, landing, legalPage, settingsClient, preferencesRoute, passwordRoute, stylesheet, appHeader, schema] =
  await Promise.all([
    read("../src/lib/i18n.ts"),
    read("../src/components/LanguageProvider.tsx"),
    read("../src/components/FeedClient.tsx"),
    read("../src/components/MessagesClient.tsx"),
    read("../src/components/GroupDetailClient.tsx"),
    read("../src/components/GroupPostComments.tsx"),
    read("../src/components/GroupsClient.tsx"),
    read("../src/components/PeopleClient.tsx"),
    read("../src/components/ProfileClient.tsx"),
    read("../src/components/PublicProfileClient.tsx"),
    read("../src/components/UserAvatar.tsx"),
    read("../src/app/page.tsx"),
    read("../src/components/LegalPage.tsx"),
    read("../src/components/SettingsClient.tsx"),
    read("../src/app/api/me/preferences/route.ts"),
    read("../src/app/api/me/password/route.ts"),
    read("../src/app/globals.css"),
    read("../src/components/AppHeader.tsx"),
    read("../db/schema.sql"),
  ]);

const dictionaryMatch = dictionarySource.match(
  /export const AR_TO_EN: Record<string, string> = (\{[\s\S]*?\});\s*export function translateArabicText/,
);
assert.ok(dictionaryMatch, "locale dictionary must be a valid JSON-compatible object");
const dictionaryBlock = dictionaryMatch[1];
const dictionary = JSON.parse(dictionaryBlock);
const rawKeys = [...dictionaryBlock.matchAll(/^\s*("(?:\\.|[^"\\])*")\s*:/gm)].map((match) => JSON.parse(match[1]));

assert.ok(Object.keys(dictionary).length >= 800, "the UI needs a substantial curated English glossary");
assert.equal(rawKeys.length, new Set(rawKeys).size, "duplicate locale keys are not allowed");
assert.equal(dictionary["ليه AXIS؟"], "Why AXIS?");
assert.equal(dictionary["مساحة خاصة للمهندسين"], "A community built for engineers");
assert.equal(dictionary["AXIS — مجتمع المهندسين"], "AXIS — Engineering Community");
assert.equal(dictionary["مساحة للمهندسين لتبادل الخبرات والأسئلة وتجارب مواقع العمل داخل مجتمع بعضوية موثّقة."], "A verified-membership community for engineers to share experience, questions, and site-work insights.");
assert.ok(Object.values(dictionary).every((value) => typeof value === "string"), "all locale entries must have string values");
assert.ok(Object.values(dictionary).every((value) => !/[\u0600-\u06FF]/u.test(value)), "English locale values must not contain Arabic script");

assert.match(languageProvider, /document\.documentElement\.lang = localeState/);
assert.match(languageProvider, /usePathname/);
assert.match(languageProvider, /document\.title = translateArabicText\(original\.title\)/);
assert.match(languageProvider, /descriptionMeta\.content = translateArabicText\(original\.description\)/);
assert.match(landing, /<LocalizedContent>\{<main/);
assert.doesNotMatch(legalPage, /<main className="legal-page" dir="rtl">/);
assert.match(languageProvider, /document\.documentElement\.dir = localeState === "ar" \? "rtl" : "ltr"/);
assert.match(languageProvider, /localStorage\.getItem\("axis-locale"\)/);
assert.match(languageProvider, /localStorage\.setItem\("axis-locale", localeState\)/);
assert.match(languageProvider, /fetch\("\/api\/me\/preferences", \{ cache: "no-store" \}\)/);
assert.match(languageProvider, /\}, \[pathname\]\);/, "saved account preferences must refresh when route changes after sign-in");
assert.match(languageProvider, /if \(payload\.locale === "ar" \|\| payload\.locale === "en"\) \{\s*setLocaleState\(payload\.locale\);/);
assert.match(languageProvider, /hasUserContentBoundary/);
assert.match(languageProvider, /no-translate/);
assert.doesNotMatch(languageProvider, /MutationObserver|document\.body\.innerText|querySelectorAll\(/);
assert.doesNotMatch(languageProvider, /language-switcher|toggleLocale/, "the language control belongs in account settings, not as a floating button");
assert.equal(stylesheet.includes(".language-switcher"), false, "floating language-switcher styles must be removed");
assert.ok(appHeader.includes('href="/settings"'), "settings must be reachable from the app header");
assert.ok(settingsClient.includes("settings-tabs"));
assert.ok(settingsClient.includes("/api/me/password"));
assert.ok(settingsClient.includes("/api/me/preferences"));
assert.ok(settingsClient.includes('method: "PATCH"'));
assert.ok(settingsClient.includes("value={user.email} readOnly"));
assert.ok(preferencesRoute.includes("preferred_locale"));
assert.ok(preferencesRoute.includes("ui_preferences"));
assert.ok(passwordRoute.includes("verifyPassword(currentPassword, currentHash)"));
assert.ok(passwordRoute.includes("hashPassword(newPassword)"));
assert.ok(passwordRoute.includes("DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2"));
assert.ok(schema.includes("preferred_locale text NOT NULL DEFAULT 'ar'"));
assert.ok(schema.includes("ui_preferences jsonb NOT NULL DEFAULT"));

assert.match(feed, /className=\{\x60\$\{className\} no-translate\x60\}/, "post bodies must not be run through UI localization");
assert.match(feed, /<p className="no-translate">\{comment\.body\}<\/p>/);
assert.match(feed, /post-author-name no-translate/);
assert.match(messages, /<p className="no-translate">\{m\.body\}<\/p>/, "direct-message content must remain verbatim");
assert.match(messages, /c\.last_message \? <span className="no-translate">\{c\.last_message\}<\/span>/);
assert.match(groupDetail, /<p className="no-translate">\{p\.body\}<\/p>/);
assert.match(groupComments, /<p className="no-translate">\{comment\.body\}<\/p>/);
assert.match(groups, /group-card-title no-translate/);
assert.match(people, /person-card-bio no-translate/);
assert.match(profile, /profile-post-body no-translate/);
assert.match(publicProfile, /<p className="no-translate">\{post\.body\}<\/p>/);
assert.match(avatar, /data-user-content=\{true\}/, "member-provided names and accessible avatar labels must be preserved");

console.log(`AXIS localization checks passed: ${Object.keys(dictionary).length} curated entries, locale direction/persistence, and member-content protection.`);
