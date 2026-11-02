import { test, expect } from "@playwright/test";
async function demo(page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore demo dashboard", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Usage overview", exact: true }),
  ).toBeVisible();
}
test("demo filters, model selection, inspect, export and all routes", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await demo(page);
  await expect(
    page.getByRole("link", { name: "Request history", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("$97.50", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "24 hours", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "24 hours", exact: true }),
  ).toHaveClass("active");
  await expect(page.locator("svg[role=img] [role=button]")).toHaveCount(25);
  await page.locator(".model-filter select").selectOption("gpt-oss:120b");
  await page.locator("svg[role=img] [role=button]").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("ollama-usage-24h.csv");
  for (const name of ["Models", "API explorer", "Settings"]) {
    await page.getByRole("link", { name, exact: true }).click();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("link", { name: "API explorer", exact: true }).click();
  await page.getByRole("button", { name: "Execute", exact: true }).click();
  await expect(page.locator(".explorer pre")).toContainText("buckets");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Connect your account", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
for (const viewport of [
  { width: 1440, height: 1050 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
])
  for (const theme of ["light", "dark"])
    test(`responsive ${viewport.width} ${theme}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      if (theme === "dark")
        await page
          .getByRole("button", { name: "Toggle theme", exact: true })
          .click();
      await expect(page.locator("body")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/login-${viewport.width}-${theme}.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Explore demo dashboard", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Usage overview", exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/overview-${viewport.width}-${theme}.png`,
        fullPage: true,
      });
      if (viewport.width < 640) {
        await page.getByRole("button", { name: "Toggle navigation" }).click();
        await page.getByRole("link", { name: "Models", exact: true }).click();
        await expect(
          page.getByRole("heading", { name: "Models", exact: true }),
        ).toBeVisible();
      }
    });
for (const locale of [
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
])
  test(`locale ${locale} persists before and after login`, async ({ page }) => {
    await page.goto("/");
    await page.locator(".language select").selectOption(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await page.reload();
    await expect(page.locator(".language select")).toHaveValue(locale);
    await page.locator(".demo-button").click();
    await expect(page.locator(".kpi-grid")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "dir",
      locale.startsWith("ar") ? "rtl" : "ltr",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/locale-${locale}.png`,
      fullPage: true,
    });
  });
test("real HTTP path through simulated Ollama and safe credential storage", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Bearer token", { exact: true }).fill("test");
  await page
    .getByRole("button", { name: "Open dashboard", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Usage overview", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("$97.50", { exact: true }).first()).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).every((k) => !k.includes("token")),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "30 days", exact: true }).click();
  await expect(page.locator("svg[role=img] [role=button]")).toHaveCount(31, {
    timeout: 15000,
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.locator("#token")).toHaveValue("");
});
test("invalid token stays on login with useful error", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Bearer token", { exact: true }).fill("invalid");
  await page
    .getByRole("button", { name: "Open dashboard", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Ollama rejected");
});
test("legacy plan never presents absent costs as zero", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Bearer token", { exact: true }).fill("legacy");
  await page
    .getByRole("button", { name: "Open dashboard", exact: true })
    .click();
  await expect(page.locator(".legacy").first()).toBeVisible();
  await expect(page.locator(".kpi").first()).toContainText("Unavailable");
  await expect(page.locator(".balance-kpi")).toContainText("Unavailable");
});
test("upstream Retry-After is visible", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Bearer token", { exact: true }).fill("limited");
  await page
    .getByRole("button", { name: "Open dashboard", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Rate limit");
  await expect(
    page.getByRole("button", { name: "Open dashboard", exact: true }),
  ).toBeDisabled();
});
