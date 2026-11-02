import { test, expect } from "@playwright/test";
async function openExplorer(page, real = false) {
  await page.goto("/");
  if (real) {
    await page.getByLabel("Bearer token", { exact: true }).fill("test");
    await page
      .getByRole("button", { name: "Open dashboard", exact: true })
      .click();
  } else
    await page
      .getByRole("button", { name: "Explore demo dashboard", exact: true })
      .click();
  await expect(
    page.getByRole("heading", { name: "Usage overview", exact: true }),
  ).toBeVisible();
  if (await page.getByRole("button", { name: "Toggle navigation" }).isVisible())
    await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("link", { name: "API explorer", exact: true }).click();
  await expect(page.locator("#explorer-range")).toBeVisible();
}
test("query controls customize the actual HTTP request and isolate endpoint parameters", async ({
  page,
}) => {
  await openExplorer(page, true);
  await page.locator("#explorer-range").selectOption("30d");
  await page.locator("#explorer-scope").selectOption("team");
  await expect(page.locator(".explorer-preview")).toHaveText(
    "/v1.0/api/usage?range=30d&scope=team&group_by=model",
  );
  const request = page.waitForRequest((req) =>
    req.url().includes("/v1.0/api/usage?range=30d&scope=team&group_by=model"),
  );
  await page.getByRole("button", { name: "Execute", exact: true }).click();
  const sent = new URL((await request).url());
  expect(sent.searchParams.get("scope")).toBe("team");
  await expect(page.locator(".explorer pre")).toContainText('"range": "30d"', {
    timeout: 15000,
  });
  await expect(page.locator(".explorer pre")).toContainText('"scope": "team"');
  await page.getByLabel("Operation", { exact: true }).selectOption("balance");
  await expect(
    page.getByText("This endpoint has no query parameters.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".explorer pre")).not.toContainText("buckets");
  const balance = page.waitForRequest((req) =>
    req.url().endsWith("/v1.0/api/balance"),
  );
  await page.getByRole("button", { name: "Execute", exact: true }).click();
  expect(new URL((await balance).url()).search).toBe("");
  await expect(page.locator(".explorer pre")).toContainText("balance_usd");
  await page.getByLabel("Operation", { exact: true }).selectOption("health");
  await expect(page.locator(".explorer-preview")).toHaveText(
    "/v1.0/api/health",
  );
  await page.getByLabel("Operation", { exact: true }).selectOption("usage");
  await expect(page.locator("#explorer-range")).toHaveValue("30d");
  await expect(page.locator("#explorer-scope")).toHaveValue("team");
  await page.locator("#explorer-group_by").selectOption("");
  await expect(page.locator(".explorer-preview")).toHaveText(
    "/v1.0/api/usage?range=30d&scope=team",
  );
});
test("bundled contract fallback retains editable query controls", async ({
  page,
}) => {
  await page.route("**/openapi.json", (route) => route.abort());
  await openExplorer(page);
  await expect(
    page.getByText(
      "Bundled fallback: the server OpenAPI document could not be loaded.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.locator("#explorer-range").selectOption("24h");
  await page.locator("#explorer-scope").selectOption("team");
  await page.getByRole("button", { name: "Execute", exact: true }).click();
  await expect(page.locator(".explorer pre")).toContainText('"range": "24h"');
});
for (const width of [1440, 820, 390])
  for (const theme of ["light", "dark"])
    test(`explorer controls align at ${width} in ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await openExplorer(page);
      if (theme === "dark")
        await page
          .getByRole("button", { name: "Toggle theme", exact: true })
          .click();
      const selector = await page
        .getByLabel("Operation", { exact: true })
        .boundingBox();
      const button = await page
        .getByRole("button", { name: "Execute", exact: true })
        .boundingBox();
      expect(Math.abs(selector.height - button.height)).toBeLessThanOrEqual(
        0.5,
      );
      expect(Math.abs(selector.y - button.y)).toBeLessThanOrEqual(0.5);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/explorer-${width}-${theme}.png`,
        fullPage: true,
      });
    });
