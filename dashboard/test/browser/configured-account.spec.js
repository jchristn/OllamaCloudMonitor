import { test, expect } from "@playwright/test";
test.use({ baseURL: "http://127.0.0.1:8082" });
test("configured account opens without exposing or sending the server token", async ({
  page,
  request,
}) => {
  const health = await (await request.get("/v1.0/api/health")).json();
  expect(health.configured_account).toBe(true);
  expect(health).not.toHaveProperty("token");
  expect(health).not.toHaveProperty("bearer_token");
  await page.goto("/");
  const button = page.getByRole("button", {
    name: "Open configured account",
    exact: true,
  });
  await expect(button).toBeVisible();
  const usage = page.waitForRequest((req) =>
    req.url().includes("/v1.0/api/usage"),
  );
  await button.click();
  expect((await usage).headers().authorization).toBeUndefined();
  await expect(
    page.getByRole("heading", { name: "Usage overview", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("$97.50", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(button).toBeVisible();
  await expect(page.locator("#token")).toHaveValue("");
});
test("configured account still rejects an explicitly invalid browser key", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Open configured account", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Bearer token", { exact: true }).fill("invalid");
  await page
    .getByRole("button", { name: "Open dashboard", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Ollama rejected");
});
