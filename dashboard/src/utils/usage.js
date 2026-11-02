/** Select a model group without converting absent legacy metrics into zero. */
export function selectMetrics(container, model) {
  if (model === "all") return container;
  return model === "remainder"
    ? (container.remainder ?? { request_count: 0 })
    : (container.groups?.find((group) => group.model === model) ?? {
        request_count: 0,
      });
}
/** Include known zeroes for absent groups only when modern totals expose costs. */
export function metricValue(container, model, metric) {
  const selected = selectMetrics(container, model);
  if (typeof selected?.[metric] === "number") return selected[metric];
  if (
    model !== "all" &&
    !container.groups?.some((group) => group.model === model) &&
    model !== "remainder" &&
    typeof container[metric] === "number"
  )
    return 0;
  return null;
}
/** Current USD total is unavailable when the included plan uses legacy percentages. */
export function availableBalance(balance) {
  if (
    typeof balance?.included?.balance_usd !== "number" ||
    typeof balance?.purchased?.balance_usd !== "number"
  )
    return null;
  return balance.included.balance_usd + balance.purchased.balance_usd;
}
/** Escape CSV cells, including formula prefixes from untrusted model identifiers. */
export function csvCell(value) {
  let text = value == null ? "" : String(value);
  if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
/** Export the selected series with exact UTC boundaries. */
export function usageCsv(usage, model) {
  const keys = [
    "from",
    "until",
    "partial",
    "usage_usd",
    "request_count",
    "input_tokens",
    "cached_input_tokens",
    "output_tokens",
  ];
  return [
    keys.map(csvCell).join(","),
    ...usage.buckets.map((bucket) =>
      keys
        .map((key) =>
          csvCell(
            key in bucket && ["from", "until", "partial"].includes(key)
              ? bucket[key]
              : metricValue(bucket, model, key),
          ),
        )
        .join(","),
    ),
  ].join("\r\n");
}
