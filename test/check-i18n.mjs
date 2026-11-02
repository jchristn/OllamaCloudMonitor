import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { parse } from "../dashboard/node_modules/@babel/parser/lib/index.js";
import { locales } from "../dashboard/src/i18n/localeRegistry.js";
const root = path.resolve(import.meta.dirname, "../dashboard/src");
const catalogDirectory = path.join(root, "i18n/locales");
const resources = Object.fromEntries(
  fs
    .readdirSync(catalogDirectory)
    .filter((name) => name.endsWith(".json"))
    .map((name) => [
      name.slice(0, -5),
      {
        translation: JSON.parse(
          fs.readFileSync(path.join(catalogDirectory, name), "utf8"),
        ),
      },
    ]),
);
assert.deepEqual(
  Object.keys(resources).sort(),
  locales.map((locale) => locale.code).sort(),
  "Registry and catalogs must match",
);
for (const locale of locales) {
  assert(
    locale.name &&
      locale.englishName &&
      ["ltr", "rtl"].includes(locale.dir) &&
      locale.fallback === "en",
    `Incomplete metadata: ${locale.code}`,
  );
  assert.equal(
    Intl.getCanonicalLocales(locale.code)[0],
    locale.code,
    `Noncanonical locale: ${locale.code}`,
  );
}
const keys = new Set(Object.keys(resources.en.translation));
const used = new Set();
// Dynamically selected semantic messages and wire-enum label mappings are explicit here.
const dynamic = [
  "Overview",
  "Models",
  "API explorer",
  "Settings",
  "Demo mode",
  "Connected",
  "Connecting…",
  "Open dashboard",
  "Show token",
  "Hide token",
  "Loading…",
  "No data loaded",
  "24 hours",
  "7 days",
  "30 days",
  "Cost (USD)",
  "Requests",
  "Input tokens",
  "Cached input tokens",
  "Output tokens",
  "Model",
  "Session limit",
  "Weekly limit",
  "Bundled fallback: the server OpenAPI document could not be loaded.",
  "Operations loaded from the monitor OpenAPI contract.",
  "Execute",
  "Compare the returned model groups. Ollama returns at most ten named models, plus other models.",
  "Browser preferences and deployment information.",
  "Execute read-only operations with your current bearer session.",
  "rateLimited",
  "unauthorized",
  "forbidden",
  "requestFailed",
  "invalidResponse",
  "networkError",
  "balanceFailed",
];
for (const key of dynamic) {
  assert(keys.has(key), `Missing dynamic key: ${key}`);
  used.add(key);
}
function walk(node) {
  if (!node || typeof node !== "object") return;
  if (
    node.type === "CallExpression" &&
    node.callee?.name === "t" &&
    node.arguments[0]?.type === "StringLiteral"
  ) {
    const key = node.arguments[0].value;
    assert(keys.has(key), `Missing key: ${key}`);
    used.add(key);
  }
  if (node.type === "JSXText" && node.value.trim()) {
    assert(
      [
        "Ollama Cloud Monitor",
        "Ollama",
        "Cloud Monitor",
        "v0.1.0",
        "/",
        "UTC",
        "0.1.0",
        "https://ollama.com",
        "GET",
      ].includes(node.value.trim()),
      `Hard-coded UI text: ${node.value.trim()}`,
    );
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "start" || key === "end") continue;
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") walk(value);
  }
}
function inspect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) inspect(file);
    else if (/\.(jsx|js)$/.test(entry.name) && !entry.name.endsWith(".test.js"))
      walk(
        parse(fs.readFileSync(file, "utf8"), {
          sourceType: "module",
          plugins: ["jsx"],
        }),
      );
  }
}
inspect(root);
for (const key of keys)
  assert(used.has(key), `Orphaned translation key: ${key}`);
for (const [locale, resource] of Object.entries(resources)) {
  assert.deepEqual(
    Object.keys(resource.translation).sort(),
    [...keys].sort(),
    `${locale} key parity`,
  );
  for (const [key, value] of Object.entries(resource.translation)) {
    assert(
      value && !value.includes("\ufffd"),
      `${locale}/${key} invalid encoding`,
    );
    assert.deepEqual(
      value.match(/\{\{\w+\}\}/g) ?? [],
      resources.en.translation[key].match(/\{\{\w+\}\}/g) ?? [],
      `${locale}/${key} interpolation`,
    );
  }
}
console.log(
  `PASS: ${keys.size} translation keys across ${Object.keys(resources).length} locales; JSX text, key use, encoding, and interpolation checks.`,
);
