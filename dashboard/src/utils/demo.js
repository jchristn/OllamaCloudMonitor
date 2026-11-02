/** Deterministic synthetic account. Never presented as live Ollama data. */
export function demoUsage(range = "7d", scope = "self") {
  const count = range === "24h" ? 25 : range === "7d" ? 8 : 31;
  const step = range === "24h" ? 3600000 : 86400000;
  const now = Date.now();
  const start = Math.floor(now / step) * step - (count - 1) * step;
  const models = ["qwen3-coder:480b", "gpt-oss:120b", "deepseek-v3.1:671b"];
  const buckets = Array.from({ length: count }, (_, i) => {
    const groups = models.map((model, j) => ({
      model,
      request_count: ((i * 13 + j * 7) % 80) + 8,
      usage_usd: +(
        (Math.sin(i * 1.6 + j) + 1.5) *
        (j === 0 ? 1.1 : 0.45)
      ).toFixed(4),
      input_tokens: (i + 1) * 8200 * (j + 1),
      cached_input_tokens: (i + 1) * 1200,
      output_tokens: (i + 1) * 2100,
    }));
    const metrics = Object.fromEntries(
      [
        "usage_usd",
        "request_count",
        "input_tokens",
        "cached_input_tokens",
        "output_tokens",
      ].map((key) => [key, groups.reduce((sum, group) => sum + group[key], 0)]),
    );
    return {
      from: new Date(start + i * step).toISOString(),
      until: new Date(
        i === count - 1 ? now : start + (i + 1) * step,
      ).toISOString(),
      partial: i === count - 1,
      groups,
      ...metrics,
    };
  });
  const totals = Object.fromEntries(
    [
      "usage_usd",
      "request_count",
      "input_tokens",
      "cached_input_tokens",
      "output_tokens",
    ].map((key) => [
      key,
      buckets.reduce((sum, bucket) => sum + bucket[key], 0),
    ]),
  );
  totals.groups = models.map((model) => ({
    model,
    ...Object.fromEntries(
      [
        "usage_usd",
        "request_count",
        "input_tokens",
        "cached_input_tokens",
        "output_tokens",
      ].map((key) => [
        key,
        buckets.reduce(
          (sum, bucket) =>
            sum + bucket.groups.find((g) => g.model === model)[key],
          0,
        ),
      ]),
    ),
  }));
  return {
    range,
    scope,
    granularity: range === "24h" ? "hour" : "day",
    from: buckets[0].from,
    until: new Date(now).toISOString(),
    totals,
    buckets,
  };
}
export const demoBalance = {
  included: {
    balance_usd: 72.5,
    allowance_usd: 100,
    period: { from: "2026-11-01T00:00:00Z", until: "2026-12-01T00:00:00Z" },
  },
  purchased: { balance_usd: 25 },
};
