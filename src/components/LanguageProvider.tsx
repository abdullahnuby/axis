'use client';

import { useEffect, useState, type ReactNode } from "react";
import { translateArabicText } from "@/lib/i18n";

type Locale = "ar" | "en";

const SKIP_TEXT_SELECTOR = [
  "[data-locale-switcher]",
  "script",
  "style",
  "textarea",
  "input",
  "[contenteditable='true']",
  ".post-body",
  ".message-text",
  ".message-content",
  "[data-user-content='true']",
].join(",");

const originalText = new WeakMap<Text, string>();
const lastAppliedText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
let originalDocumentTitle: string | undefined;
let lastAppliedDocumentTitle: string | undefined;
const lastAppliedAttributes = new WeakMap<Element, Map<string, string>>();

function shouldSkip(element: Element | null): boolean {
  return Boolean(element?.closest(SKIP_TEXT_SELECTOR));
}

function localizeTextNode(node: Text, locale: Locale) {
  const current = node.nodeValue ?? "";
  const lastApplied = lastAppliedText.get(node);
  if (!originalText.has(node) || (lastApplied !== undefined && current !== lastApplied)) {
    originalText.set(node, current);
  }

  const source = originalText.get(node) ?? current;
  const next = locale === "en" ? translateArabicText(source) : source;
  if (node.nodeValue !== next) node.nodeValue = next;
  lastAppliedText.set(node, next);
}

function localizeAttributes(element: Element, locale: Locale) {
  if (element.closest('[data-locale-switcher], script, style, .post-body, .message-text, .message-content, [data-user-content="true"]')) return;
  const attributes = ["placeholder", "title", "aria-label"];
  if (element.matches('meta[name="description"], meta[property="og:description"]')) attributes.push("content");
  let originals = originalAttributes.get(element);
  if (!originals) {
    originals = new Map<string, string>();
    originalAttributes.set(element, originals);
  }
  let applied = lastAppliedAttributes.get(element);
  if (!applied) {
    applied = new Map<string, string>();
    lastAppliedAttributes.set(element, applied);
  }

  for (const attribute of attributes) {
    const current = element.getAttribute(attribute);
    if (current === null) continue;
    const last = applied.get(attribute);
    if (!originals.has(attribute) || (last !== undefined && current !== last)) {
      originals.set(attribute, current);
    }
    const source = originals.get(attribute) ?? current;
    const next = locale === "en" ? translateArabicText(source) : source;
    if (current !== next) element.setAttribute(attribute, next);
    applied.set(attribute, next);
  }
}

function localizeDocument(locale: Locale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  document.documentElement.dataset.locale = locale;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    if (shouldSkip(textNode.parentElement)) continue;
    localizeTextNode(textNode, locale);
  }
  document.documentElement.querySelectorAll("*").forEach((element) => localizeAttributes(element, locale));
  const currentTitle = document.title;
  if (originalDocumentTitle === undefined || (lastAppliedDocumentTitle !== undefined && currentTitle !== lastAppliedDocumentTitle)) {
    originalDocumentTitle = currentTitle;
  }
  const nextTitle = locale === "en" ? translateArabicText(originalDocumentTitle ?? currentTitle) : (originalDocumentTitle ?? currentTitle);
  if (document.title !== nextTitle) document.title = nextTitle;
  lastAppliedDocumentTitle = nextTitle;
}

export function LanguageProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [locale, setLocale] = useState<Locale>("ar");

  useEffect(() => {
    try {
      if (window.localStorage.getItem("axis-locale") === "en") setLocale("en");
    } catch {
      // Language switching still works for this session if storage is unavailable.
    }
  }, []);

  useEffect(() => {
    localizeDocument(locale);
    const observer = new MutationObserver(() => localizeDocument(locale));
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label", "content"],
    });
    try {
      window.localStorage.setItem("axis-locale", locale);
    } catch {
      // Ignore storage restrictions; the selected language remains active in memory.
    }
    return () => observer.disconnect();
  }, [locale]);

  function toggleLocale() {
    setLocale((current) => current === "ar" ? "en" : "ar");
  }

  return (
    <>
      {children}
      <button
        className="language-switcher"
        data-locale-switcher="true"
        type="button"
        onClick={toggleLocale}
        aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
        title={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      >
        <span aria-hidden="true">文A</span>
        {locale === "ar" ? "English" : "العربية"}
      </button>
    </>
  );
}
