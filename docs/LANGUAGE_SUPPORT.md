# AXIS language support

AXIS now has a global Arabic/English language switcher.

- Arabic remains the default language with right-to-left layout.
- English switches the document direction to left-to-right.
- The selection is saved in the browser as `axis-locale` and is restored on the next visit.
- The shared dictionary covers common labels and interface messages across the landing page, sign-in and registration, feed, groups, member directory, profiles, messaging, notifications, settings, verification, and administration.
- User-generated posts and message bodies are deliberately left unchanged. Translating member content would change what people actually wrote and could distort reports or workplace discussions.
- Add new visible UI phrases to `src/lib/i18n.ts` as the interface evolves. For a future full localization pass, prefer moving component strings into locale dictionaries rather than adding new DOM-level translations.
- The language selector is part of the root layout, so it is available on public and authenticated routes without changing route structure or authentication rules.
