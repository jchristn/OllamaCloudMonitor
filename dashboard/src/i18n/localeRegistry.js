/** Supported BCP 47 locales, display names, layout direction and fallback policy. */
export const locales = [
  {
    code: "en",
    englishName: "English",
    name: "English",
    dir: "ltr",
    fallback: "en",
  },
  {
    code: "es",
    englishName: "Spanish",
    name: "Español",
    dir: "ltr",
    fallback: "en",
  },
  {
    code: "pt-BR",
    englishName: "Portuguese (Brazil)",
    name: "Português (Brasil)",
    dir: "ltr",
    fallback: "en",
  },
  {
    code: "fr",
    englishName: "French",
    name: "Français",
    dir: "ltr",
    fallback: "en",
  },
  {
    code: "it",
    englishName: "Italian",
    name: "Italiano",
    dir: "ltr",
    fallback: "en",
  },
  {
    code: "de",
    englishName: "German",
    name: "Deutsch",
    dir: "ltr",
    fallback: "en",
  },
  {
    code: "zh-Hans",
    englishName: "Chinese (Simplified)",
    name: "简体中文",
    dir: "ltr",
    fallback: "en",
    fontNotes: "Simplified Chinese; system CJK font fallback.",
  },
  {
    code: "ar",
    englishName: "Arabic",
    name: "العربية",
    dir: "rtl",
    fallback: "en",
    fontNotes: "Arabic shaping and RTL layout.",
  },
  {
    code: "ru",
    englishName: "Russian",
    name: "Русский",
    dir: "ltr",
    fallback: "en",
    fontNotes: "Cyrillic script.",
  },
  {
    code: "ms",
    englishName: "Malay",
    name: "Bahasa Melayu",
    dir: "ltr",
    fallback: "en",
  },
  {
    code: "hi",
    englishName: "Hindi",
    name: "हिन्दी",
    dir: "ltr",
    fallback: "en",
    fontNotes: "Devanagari shaping; system font fallback.",
  },
  {
    code: "ja",
    englishName: "Japanese",
    name: "日本語",
    dir: "ltr",
    fallback: "en",
    fontNotes: "Japanese; system CJK font fallback.",
  },
  {
    code: "en-XA",
    englishName: "Pseudo: expanded",
    name: "Pseudo: expanded",
    dir: "ltr",
    fallback: "en",
    pseudo: true,
  },
  {
    code: "ar-XB",
    englishName: "Pseudo: RTL",
    name: "Pseudo: RTL",
    dir: "rtl",
    fallback: "en",
    pseudo: true,
  },
];

/** Canonicalize regional browser tags and old preferences to a supported locale. */
export function canonicalLocale(value) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replaceAll("_", "-").toLowerCase();
  if (normalized === "kanji") return "ja";
  const exact = locales.find(
    (locale) => locale.code.toLowerCase() === normalized,
  );
  if (exact) return exact.code;
  const primary = normalized.split("-")[0];
  return locales.find(
    (locale) => !locale.pseudo && locale.code.split("-")[0] === primary,
  )?.code;
}
