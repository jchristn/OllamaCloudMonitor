import { describe, it, expect } from "vitest";
import { availableBalance, metricValue, usageCsv, csvCell } from "./usage";
import { demoUsage } from "./demo";
const catalogs = import.meta.glob("../i18n/locales/*.json", {
  eager: true,
  import: "default",
});
const resources = Object.fromEntries(
  Object.entries(catalogs).map(([file, translation]) => [
    file.split("/").at(-1).slice(0, -5),
    { translation },
  ]),
);
describe("Ollama usage accounting", () => {
  it("uses authoritative totals including the remainder", () => {
    const totals = {
      request_count: 12,
      usage_usd: 7,
      groups: [{ model: "one", usage_usd: 3 }],
      remainder: { usage_usd: 4 },
    };
    expect(metricValue(totals, "all", "usage_usd")).toBe(7);
    expect(metricValue(totals, "one", "usage_usd")).toBe(3);
    expect(metricValue(totals, "remainder", "usage_usd")).toBe(4);
  });
  it("keeps unavailable legacy costs unknown, with known missing modern groups equal to zero", () => {
    expect(
      metricValue({ request_count: 2, groups: [] }, "one", "usage_usd"),
    ).toBeNull();
    expect(metricValue({ usage_usd: 3, groups: [] }, "one", "usage_usd")).toBe(
      0,
    );
    expect(metricValue({ request_count: 2 }, "all", "input_tokens")).toBeNull();
  });
  it("never sums a legacy percentage into USD", () => {
    expect(
      availableBalance({
        included: { session: { remaining_percent: 50 } },
        purchased: { balance_usd: 25 },
      }),
    ).toBeNull();
    expect(
      availableBalance({
        included: { balance_usd: 0 },
        purchased: { balance_usd: 25 },
      }),
    ).toBe(25);
  });
  it("exports UTC boundaries, partial flag and selected group values", () => {
    const usage = demoUsage("24h");
    const csv = usageCsv(usage, "gpt-oss:120b");
    expect(csv.split("\r\n")).toHaveLength(26);
    expect(csv).toContain('"true"');
    expect(csv).toContain(usage.buckets[0].from);
    expect(csvCell("=HYPERLINK(1)")).toBe('"\'=HYPERLINK(1)"');
    expect(csvCell('a"b')).toBe('"a""b"');
  });
  it("synthetic demo totals reconcile across all allowed ranges", () => {
    for (const range of ["24h", "7d", "30d"]) {
      const usage = demoUsage(range);
      expect(usage.totals.request_count).toBe(
        usage.buckets.reduce((sum, b) => sum + b.request_count, 0),
      );
      expect(usage.totals.usage_usd).toBeCloseTo(
        usage.totals.groups.reduce((sum, g) => sum + g.usage_usd, 0),
      );
    }
  });
});
describe("locale catalogs", () => {
  it("has identical complete keys and interpolation variables", () => {
    const en = resources.en.translation;
    for (const locale of Object.keys(resources)) {
      expect(Object.keys(resources[locale].translation).sort()).toEqual(
        Object.keys(en).sort(),
      );
      for (const key of Object.keys(en)) {
        expect(
          resources[locale].translation[key].match(/\{\{\w+\}\}/g) ?? [],
        ).toEqual(en[key].match(/\{\{\w+\}\}/g) ?? []);
      }
    }
  });
  it("formats currencies, dates and counts for Latin, CJK and RTL locale families", () => {
    for (const locale of [
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
    ]) {
      expect(
        new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "USD",
        }).format(25),
      ).toBeTruthy();
      expect(
        new Intl.DateTimeFormat(locale, { timeZone: "UTC" }).format(
          new Date("2026-11-01T00:00:00Z"),
        ),
      ).toBeTruthy();
    }
  });
});
