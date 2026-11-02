import { test, expect } from "@playwright/test";
import { demoUsage } from "../../src/utils/demo.js";
async function demo(page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore demo dashboard", exact: true })
    .click();
  await expect(page.locator("svg[role=img]")).toBeVisible();
}
async function contained(page) {
  const tip = page.getByRole("tooltip");
  await expect(tip).toBeVisible();
  const box = await tip.boundingBox();
  const bounds = await page.locator(".content").boundingBox();
  const viewport = page.viewportSize();
  expect(box.x).toBeGreaterThanOrEqual(Math.max(0, bounds.x));
  expect(box.y).toBeGreaterThanOrEqual(Math.max(0, bounds.y));
  expect(box.x + box.width).toBeLessThanOrEqual(
    Math.min(viewport.width, bounds.x + bounds.width) + 1,
  );
  expect(box.y + box.height).toBeLessThanOrEqual(
    Math.min(viewport.height, bounds.y + bounds.height) + 1,
  );
  await expect(page.locator(".main-shell > [role=tooltip]")).toHaveCount(1);
  return box;
}
test("all usage metrics show full interval and exact values above the bars", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await demo(page);
  const first = page.locator("svg[role=img] [role=button]").first();
  for (const [value, label] of [
    ["usage_usd", "Usage cost"],
    ["request_count", "Requests"],
    ["input_tokens", "Input tokens"],
    ["cached_input_tokens", "Cached input tokens"],
    ["output_tokens", "Output tokens"],
  ]) {
    await page
      .getByRole("combobox", { name: "Chart metric", exact: true })
      .selectOption(value);
    await page.mouse.move(0, 0);
    await first.hover();
    const tip = page.getByRole("tooltip");
    await expect(tip.locator(".chart-tooltip-title")).toHaveText("All models");
    await expect(tip.locator(".chart-tooltip-time")).toContainText("UTC →");
    await expect(tip.locator(".chart-tooltip-time")).toContainText(
      String(new Date().getUTCFullYear()),
    );
    for (const metric of [
      "Usage cost",
      "Requests",
      "Input tokens",
      "Cached input tokens",
      "Output tokens",
    ])
      await expect(tip.getByText(metric, { exact: true })).toBeVisible();
    await expect(tip.locator(".emphasized dt")).toHaveText(label);
    const expected = new Intl.NumberFormat("en", {
      maximumFractionDigits: 0,
    }).format(demoUsage().buckets[0].request_count);
    await expect(
      tip
        .locator(".chart-tooltip-row")
        .filter({ has: page.locator("dt", { hasText: /^Requests$/ }) })
        .locator("dd"),
    ).toHaveText(expected);
    const box = await contained(page);
    const bar = await page.locator("svg[role=img] .bar").first().boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(bar.y + 1);
  }
  await page.screenshot({
    path: "test-results/chart-tooltip-desktop.png",
    fullPage: true,
  });
});
for (const width of [1440, 820, 390])
  for (const rtl of [false, true])
    test(`tooltip edges stay in the workspace at ${width}, RTL=${rtl}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await demo(page);
      if (rtl) {
        await page.locator(".language select").selectOption("ar");
        await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      }
      await page.locator(".segmented button").first().click();
      await expect(page.locator("svg[role=img] [role=button]")).toHaveCount(25);
      const targets = page.locator("svg[role=img] [role=button]");
      for (const target of [targets.first(), targets.last()]) {
        await target.hover();
        await contained(page);
      }
      await expect(
        page.getByRole("tooltip").locator(".chart-tooltip-footer"),
      ).toBeVisible();
      if (width === 390)
        await page.screenshot({
          path: `test-results/chart-tooltip-mobile-${rtl ? "rtl" : "ltr"}.png`,
          fullPage: true,
        });
      await page.mouse.wheel(0, 150);
      await contained(page);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("tooltip")).toHaveCount(0);
    });
test("keyboard and model share/credit charts use the same overlay", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await demo(page);
  const target = page.locator("svg[role=img] [role=button]").first();
  await target.scrollIntoViewIfNeeded();
  await target.focus();
  await contained(page);
  await expect(target).toHaveAttribute(
    "aria-describedby",
    await page.getByRole("tooltip").getAttribute("id"),
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await target.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  const row = page.locator(".model-row").first();
  await row.hover();
  await contained(page);
  await expect(
    page.getByRole("tooltip").locator(".chart-tooltip-title"),
  ).toHaveText("qwen3-coder:480b");
  await expect(
    page.getByRole("tooltip").locator(".chart-tooltip-time"),
  ).toContainText("UTC →");
  const progress = page.locator(".credit-panel progress");
  await progress.hover();
  await contained(page);
  await expect(
    page.getByRole("tooltip").locator(".chart-tooltip-title"),
  ).toHaveText("Credit balance");
  await expect(
    page.getByRole("tooltip").locator(".chart-tooltip-time"),
  ).toContainText("Updated");
  await expect(page.getByRole("tooltip")).toContainText("$97.50");
  await expect(
    page.getByRole("tooltip").locator(".chart-tooltip-footer"),
  ).toContainText("72.5%");
  await progress.focus();
  await expect(progress).toHaveAttribute(
    "aria-describedby",
    await page.getByRole("tooltip").getAttribute("id"),
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("tooltip")).toHaveCount(0);
});
test.describe("touch chart details", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("first tap shows details and second tap opens the bucket inspector", async ({
    page,
  }) => {
    await demo(page);
    const bar = page.locator("svg[role=img] [role=button]").first();
    await bar.tap();
    await contained(page);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await bar.tap();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("tooltip")).toHaveCount(0);
  });
});
