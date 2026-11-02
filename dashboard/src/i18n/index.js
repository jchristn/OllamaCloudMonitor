import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import english from "./locales/en.json";
import { locales, canonicalLocale } from "./localeRegistry";
export { locales } from "./localeRegistry";
const catalogs = import.meta.glob(["./locales/*.json", "!./locales/en.json"], {
  import: "default",
});
const catalogBackend = {
  type: "backend",
  read(language, namespace, callback) {
    const loader = catalogs[`./locales/${language}.json`];
    if (!loader) {
      callback(new Error("Unsupported locale catalog"), null);
      return;
    }
    loader()
      .then((catalog) => callback(null, catalog))
      .catch((error) => callback(error, null));
  },
};
function applyLocale(language) {
  const locale = locales.find(
    (item) => item.code === (canonicalLocale(language) ?? "en"),
  );
  document.documentElement.lang = locale.code;
  document.documentElement.dir = locale.dir;
}
i18n.on("languageChanged", applyLocale);
/** Wait for the detected locale before the first application render. */
export const localeReady = i18n
  .use(catalogBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    initImmediate: false,
    resources: { en: { translation: english } },
    partialBundledLanguages: true,
    supportedLngs: locales.map((locale) => locale.code),
    fallbackLng: "en",
    load: "currentOnly",
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "monitor.locale",
      caches: ["localStorage"],
      convertDetectedLanguage: (language) =>
        canonicalLocale(language) ?? language,
    },
  })
  .then(() => applyLocale(i18n.language));
export default i18n;
