import { describe, it, expect } from "vitest";
import { canonicalLocale, locales } from "./localeRegistry";
describe("Locale registry and aliases", () => {
  it("includes all twelve baseline languages and both pseudo-locales", () => {
    expect(locales.map((locale) => locale.code)).toEqual([
      "en",
      "es",
      "pt-BR",
      "fr",
      "it",
      "de",
      "zh-Hans",
      "ar",
      "ru",
      "ms",
      "hi",
      "ja",
      "en-XA",
      "ar-XB",
    ]);
  });
  it("normalizes regional browser languages and documented aliases", () => {
    for (const [input, expected] of Object.entries({
      pt: "pt-BR",
      pt_PT: "pt-BR",
      "PT-br": "pt-BR",
      zh: "zh-Hans",
      "zh-CN": "zh-Hans",
      "zh-TW": "zh-Hans",
      "fr-CA": "fr",
      "hi-IN": "hi",
      "ru-RU": "ru",
      "ms-MY": "ms",
      "de-DE": "de",
      Kanji: "ja",
      "ar-xb": "ar-XB",
      "en-xa": "en-XA",
    }))
      expect(canonicalLocale(input)).toBe(expected);
  });
  it("leaves unsupported candidates unresolved so browser preferences or English can follow", () => {
    expect(canonicalLocale("xx-XX")).toBeUndefined();
    expect(canonicalLocale(null)).toBeUndefined();
    expect(canonicalLocale("")).toBeUndefined();
  });
  it("defines canonical metadata, real autonyms and direction for each locale", () => {
    for (const locale of locales) {
      expect(Intl.getCanonicalLocales(locale.code)[0]).toBe(locale.code);
      expect(locale.name).toBeTruthy();
      expect(locale.englishName).toBeTruthy();
      expect(locale.fallback).toBe("en");
      expect(locale.dir).toBe(locale.code.startsWith("ar") ? "rtl" : "ltr");
    }
  });
});
