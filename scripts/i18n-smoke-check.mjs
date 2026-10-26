import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [
  englishLocaleSource,
  arabicLocaleSource,
  localeResolver,
  languageProvider,
  feed,
  messages,
  groupDetail,
  groupComments,
  groups,
  people,
  profile,
  publicProfile,
  avatar,
  landing,
  legalPage,
  settingsClient,
  preferencesRoute,
  passwordRoute,
  stylesheet,
  appHeader,
  schema,
] = await Promise.all([
  read("../src/locales/en.ts"),
  read("../src/locales/ar.ts"),
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

function parseLocale(source, exportName) {
  const expression = new RegExp(
    "export const " + exportName + ": Record<string, string> = (\\{[\\s\\S]*\\});",
  );
  const match = source.match(expression);
  assert.ok(match, exportName + " must export a dedicated locale resource");
  return { messages: JSON.parse(match[1]), objectSource: match[1] };
}

const { messages: en, objectSource: enObject } = parseLocale(englishLocaleSource, "EN_MESSAGES");
const { messages: ar, objectSource: arObject } = parseLocale(arabicLocaleSource, "AR_MESSAGES");
const enKeys = Object.keys(en);
const arKeys = Object.keys(ar);
const rawEnKeys = [...enObject.matchAll(/^\s*("(?:\\.|[^"\\])*")\s*:/gm)].map((match) => JSON.parse(match[1]));
const rawArKeys = [...arObject.matchAll(/^\s*("(?:\\.|[^"\\])*")\s*:/gm)].map((match) => JSON.parse(match[1]));

assert.ok(enKeys.length >= 800, "the English locale should cover the interface, not only the landing page");
assert.equal(rawEnKeys.length, new Set(rawEnKeys).size, "English locale keys must not be duplicated");
assert.equal(rawArKeys.length, new Set(rawArKeys).size, "Arabic locale keys must not be duplicated");
assert.deepEqual(new Set(enKeys), new Set(arKeys), "both locale resources must cover the same UI message keys");
assert.equal(en["ليه AXIS؟"], "Why AXIS?");
assert.equal(en["مساحة خاصة للمهندسين"], "A community built for engineers");
assert.equal(en["AXIS — مجتمع المهندسين"], "AXIS — Engineering Community");
assert.equal(en["مساحة للمهندسين لتبادل الخبرات والأسئلة وتجارب مواقع العمل داخل مجتمع بعضوية موثّقة."], "A verified-membership community for engineers to share experience, questions, and site-work insights.");
assert.ok(Object.values(en).every((value) => typeof value === "string"), "English entries must be strings");
assert.ok(Object.values(en).every((value) => !/[\u0600-\u06FF]/u.test(value)), "English interface copy must not contain Arabic script");
assert.ok(Object.entries(ar).every(([key, value]) => key === value), "Arabic source copy must remain unchanged in the Arabic locale");
assert.match(englishLocaleSource, /Professionally authored English UI copy/);
assert.match(arabicLocaleSource, /Arabic UI copy/);

assert.match(localeResolver, /import \{ AR_MESSAGES \} from "@\/locales\/ar"/);
assert.match(localeResolver, /import \{ EN_MESSAGES \} from "@\/locales\/en"/);
assert.match(localeResolver, /export function getLocalizedText\(value: string, locale: Locale\)/);
assert.match(languageProvider, /getLocalizedText\(node, locale\)/);
assert.match(languageProvider, /document\.documentElement\.lang = localeState/);
assert.match(languageProvider, /usePathname/);
assert.match(languageProvider, /document\.title = getLocalizedText\(original\.title, localeState\)/);
assert.match(languageProvider, /descriptionMeta\.content = getLocalizedText\(original\.description, localeState\)/);
assert.match(landing, /<LocalizedContent>\{<main/);
assert.doesNotMatch(legalPage, /<main className="legal-page" dir="rtl">/);
assert.match(languageProvider, /document\.documentElement\.dir = localeState === "ar" \? "rtl" : "ltr"/);
assert.match(languageProvider, /localStorage\.getItem\("axis-locale"\)/);
assert.match(languageProvider, /localStorage\.setItem\("axis-locale", localeState\)/);
assert.match(languageProvider, /fetch\("\/api\/me\/preferences", \{ cache: "no-store" \}\)/);
assert.match(languageProvider, /\}, \[pathname\]\);/, "saved account preferences should refresh when route changes after sign-in");
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

assert.doesNotMatch(feed, /ar-EG-u-nu-latn/, "avoid Unicode numbering extensions duplicated by runtime locale formatting");
assert.match(feed, /toLocaleDateString\("ar-EG", \{[\s\S]*?numberingSystem: "latn"/, "format dates with a valid locale tag and an explicit Latin numbering system");
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

console.log(`AXIS locale-file checks passed: ${enKeys.length} shared message keys, independent ar/en resources, one shared page tree, and member-content protection.`);
