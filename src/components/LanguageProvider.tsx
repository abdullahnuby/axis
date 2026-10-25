'use client';

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { translateArabicText } from "@/lib/i18n";

export type Locale = "ar" | "en";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const USER_CONTENT_CLASS_NAMES = new Set([
  "post-body",
  "message-text",
  "message-content",
  "user-generated-content",
  "no-translate",
]);

function hasUserContentBoundary(props: Record<string, unknown>) {
  if (props["data-user-content"] === true || props["data-user-content"] === "true" || props["data-no-translate"] === true || props["data-no-translate"] === "true") return true;
  const className = typeof props.className === "string" ? props.className : "";
  return className.split(/\s+/).some((name) => USER_CONTENT_CLASS_NAMES.has(name));
}

function localizeNode(node: ReactNode, locale: Locale, insideUserContent = false): ReactNode {
  if (node === null || node === undefined || typeof node === "boolean" || typeof node === "number") {
    return node;
  }

  if (typeof node === "string") {
    return insideUserContent || locale === "ar" ? node : translateArabicText(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => localizeNode(child, locale, insideUserContent));
  }

  if (!isValidElement(node)) return node;

  const props = node.props as Record<string, unknown>;
  const skipChildren = insideUserContent || hasUserContentBoundary(props);
  if (skipChildren) return node;

  const nextProps: Record<string, unknown> = {};
  for (const attribute of ["placeholder", "title", "aria-label", "aria-description", "alt"]) {
    const value = props[attribute];
    if (typeof value === "string" && locale === "en") {
      nextProps[attribute] = translateArabicText(value);
    }
  }

  if (props.children !== undefined) {
    nextProps.children = Children.map(props.children as ReactNode, (child) => localizeNode(child, locale));
  }

  return cloneElement(node, nextProps);
}

export function LocalizedContent({ children }: Readonly<{ children: ReactNode }>) {
  const language = useLanguage();
  return <>{localizeNode(children, language.locale)}</>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return value;
}

export function LanguageProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [locale, setLocale] = useState<Locale>("ar");

  useEffect(() => {
    try {
      const savedLocale = window.localStorage.getItem("axis-locale");
      if (savedLocale === "ar" || savedLocale === "en") setLocale(savedLocale);
    } catch {
      // Keep Arabic as the default when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.locale = locale;
    try {
      window.localStorage.setItem("axis-locale", locale);
    } catch {
      // The current session can still switch languages when storage is restricted.
    }
  }, [locale]);

  const contextValue = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale,
    toggleLocale: () => setLocale((current) => current === "ar" ? "en" : "ar"),
  }), [locale]);

  return (
    <LanguageContext.Provider value={contextValue}>
      <LocalizedContent>{children}</LocalizedContent>
      <button
        className="language-switcher"
        type="button"
        onClick={contextValue.toggleLocale}
        aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
        title={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      >
        <span aria-hidden="true">文A</span>
        {locale === "ar" ? "English" : "العربية"}
      </button>
    </LanguageContext.Provider>
  );
}
