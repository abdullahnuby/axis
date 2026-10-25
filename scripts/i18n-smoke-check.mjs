import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [dictionarySource, languageProvider, feed, messages, groupDetail, groupComments, groups, people, profile, publicProfile, avatar] =
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
assert.ok(Object.values(dictionary).every((value) => typeof value === "string"), "all locale entries must have string values");
assert.ok(Object.values(dictionary).every((value) => !/[\u0600-\u06FF]/u.test(value)), "English locale values must not contain Arabic script");

assert.match(languageProvider, /document\.documentElement\.lang = locale/);
assert.match(languageProvider, /document\.documentElement\.dir = locale === "ar" \? "rtl" : "ltr"/);
assert.match(languageProvider, /localStorage\.getItem\("axis-locale"\)/);
assert.match(languageProvider, /localStorage\.setItem\("axis-locale", locale\)/);
assert.match(languageProvider, /hasUserContentBoundary/);
assert.match(languageProvider, /no-translate/);
assert.doesNotMatch(languageProvider, /MutationObserver|document\.body\.innerText|querySelectorAll\(/);

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
