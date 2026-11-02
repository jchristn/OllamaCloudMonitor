import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resources from "./resources.json";
export const locales = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "ja", name: "日本語" },
  { code: "ar", name: "العربية", dir: "rtl" },
  { code: "en-XA", name: "Pseudo: expanded" },
  { code: "ar-XB", name: "Pseudo: RTL", dir: "rtl" },
];
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    initImmediate: false,
    resources,
    supportedLngs: locales.map((l) => l.code),
    fallbackLng: "en",
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "monitor.locale",
      caches: ["localStorage"],
    },
  });
function applyLocale(locale) {
  document.documentElement.lang = locale;
  document.documentElement.dir =
    locales.find((l) => l.code === locale)?.dir ?? "ltr";
}
i18n.on("languageChanged", applyLocale);
applyLocale(i18n.language);
export default i18n;
