import { test, expect } from "@playwright/test";
import { locales } from "../../src/i18n/localeRegistry.js";
import fs from "node:fs";
import path from "node:path";
const realLocales = locales.filter((locale) => !locale.pseudo);
function catalog(code) {
  return JSON.parse(
    fs.readFileSync(path.resolve("src/i18n/locales", code + ".json"), "utf8"),
  );
}
for (const locale of realLocales)
  test(`localized mobile routes and logout for ${locale.code}`, async ({
    page,
  }) => {
    const t = catalog(locale.code);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.locator(".language select").selectOption(locale.code);
    await expect(page.locator("html")).toHaveAttribute("lang", locale.code);
    await expect(
      page.getByRole("heading", {
        name: t["Connect your account"],
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator("#token")).toHaveAttribute(
      "placeholder",
      t["Enter your Ollama API key"],
    );
    await page.locator(".demo-button").click();
    await expect(
      page.getByRole("heading", { name: t["Usage overview"], exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: t["Toggle theme"], exact: true })
      .click();
    for (const route of ["Models", "API explorer", "Settings"]) {
      await page
        .getByRole("button", { name: t["Toggle navigation"], exact: true })
        .click();
      await page.getByRole("link", { name: t[route], exact: true }).click();
      await expect(
        page.getByRole("heading", { name: t[route], exact: true, level: 1 }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (route === "API explorer") {
        await expect(page.locator("#explorer-range")).toBeVisible();
        expect(
          await page
            .locator(".explorer pre")
            .evaluate((element) => element.scrollWidth <= element.clientWidth),
        ).toBe(true);
        const selector = await page
          .getByRole("combobox", { name: t["Operation"], exact: true })
          .boundingBox();
        const execute = await page
          .getByRole("button", { name: t["Execute"], exact: true })
          .boundingBox();
        expect(selector.height).toBe(execute.height);
        await page.screenshot({
          path: `test-results/explorer-mobile-${locale.code}.png`,
          fullPage: true,
        });
      }
    }
    await page
      .getByRole("button", { name: t["Sign out"], exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: t["Connect your account"],
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".language select")).toHaveValue(locale.code);
  });
for (const [browserLocale, stored, expected] of [
  ["pt-PT", null, "pt-BR"],
  ["zh-CN", null, "zh-Hans"],
  ["hi-IN", "de-DE", "de"],
  ["fr-CA", "unsupported", "fr"],
])
  test(`language resolution ${browserLocale} with stored ${stored}`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      locale: browserLocale,
      baseURL,
    });
    if (stored)
      await context.addInitScript(
        (value) => localStorage.setItem("monitor.locale", value),
        stored,
      );
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", expected);
    await expect(page.locator(".language select")).toHaveValue(expected);
    await context.close();
  });
test("locale catalogs load on demand and initial paint waits for the selected language", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("monitor.locale", "hi"));
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(
    (url) => /\/hi-[^/]+\.js$/.test(url.pathname),
    async (route) => {
      await gate;
      await route.continue();
    },
  );
  const catalogRequest = page.waitForRequest((req) =>
    /\/hi-[^/]+\.js$/.test(new URL(req.url()).pathname),
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await catalogRequest;
  await expect(page.locator("#root")).toBeEmpty();
  release();
  await expect(
    page.getByRole("heading", {
      name: catalog("hi")["Connect your account"],
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  const loaded = [];
  page.on("request", (req) => {
    if (/\/(de|fr|it|pt-BR)-[^/]+\.js$/.test(new URL(req.url()).pathname))
      loaded.push(req.url());
  });
  await page.locator(".language select").selectOption("de");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  expect(loaded).toHaveLength(1);
  expect(new URL(loaded[0]).pathname).toMatch(/\/de-/);
});
