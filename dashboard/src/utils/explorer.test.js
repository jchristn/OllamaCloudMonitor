import { describe, it, expect } from "vitest";
import {
  explorerOperations,
  explorerDefaults,
  explorerQuery,
  explorerPath,
} from "./explorer";
describe("API explorer request building", () => {
  const operations = explorerOperations();
  const usage = operations.find((item) => item.resource === "usage");
  it("uses the canonical contract for allowed query values", () => {
    expect(
      usage.parameters.find((parameter) => parameter.name === "range").schema
        .enum,
    ).toEqual(["24h", "7d", "30d"]);
    expect(explorerDefaults(usage, { range: "30d", scope: "team" })).toEqual({
      range: "30d",
      scope: "team",
      group_by: "model",
    });
  });
  it("omits optional empty values and never leaks usage parameters into balance or health", () => {
    const values = { range: "24h", scope: "team", group_by: "" };
    expect(explorerQuery(usage, values)).toEqual({
      range: "24h",
      scope: "team",
    });
    for (const resource of ["balance", "health"])
      expect(
        explorerQuery(
          operations.find((item) => item.resource === resource),
          values,
        ),
      ).toEqual({});
  });
  it("encodes the exact query preview and limits operations to supported GET routes", () => {
    expect(
      explorerPath(usage, { range: "7d", scope: "self", group_by: "model" }),
    ).toBe("/v1.0/api/usage?range=7d&scope=self&group_by=model");
    expect(explorerPath(usage, { unexpected: "a&b +" })).toBe(
      "/v1.0/api/usage?unexpected=a%26b+%2B",
    );
    expect(
      explorerOperations({
        paths: { "/admin": { get: {} }, "/v1.0/api/usage": { post: {} } },
      }),
    ).toEqual([]);
  });
});
