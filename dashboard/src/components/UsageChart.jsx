import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { metricValue } from "../utils/usage";
import { useChartTooltip, useChartDetails } from "./ChartTooltip";
/** Responsive SVG plot with focusable buckets, exact values, and partial interval labels. */
export default function UsageChart({
  usage,
  model,
  metric,
  number,
  date,
  onInspect,
}) {
  const { t } = useTranslation();
  const chartRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(1000);
  useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      setChartWidth(Math.max(360, entries[0].contentRect.width)),
    );
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);
  const details = useChartDetails();
  const { showTooltip, hideTooltip, tooltipId, activeTarget } =
    useChartTooltip();
  const chartId = useId();
  const lastTouch = useRef(null);
  const touchPointer = useRef(false);
  const active = activeTarget?.id.startsWith(chartId + "-")
    ? Number(activeTarget.dataset.bucketIndex)
    : null;
  function show(event, bucket) {
    showTooltip(
      event,
      {
        title:
          model === "all"
            ? t("All models")
            : model === "remainder"
              ? t("Other models")
              : model,
        subtitle: details.period(bucket.from, bucket.until),
        rows: details.usageRows(bucket, model, metric),
        footer: bucket.partial ? t("Partial bucket") : undefined,
      },
      event.currentTarget.nextElementSibling,
    );
  }
  function inspect(event, bucket) {
    if (
      (touchPointer.current || event.nativeEvent.pointerType === "touch") &&
      (lastTouch.current !== event.currentTarget ||
        activeTarget !== event.currentTarget)
    ) {
      lastTouch.current = event.currentTarget;
      show(event, bucket);
      return;
    }
    lastTouch.current = null;
    hideTooltip();
    onInspect(bucket);
  }
  const values = usage.buckets.map((bucket) =>
    metricValue(bucket, model, metric),
  );
  const maximum = Math.max(0.0001, ...values.filter((value) => value != null));
  const width = chartWidth,
    height = 245,
    left = 76,
    bottom = 205,
    top = 20;
  const step = (width - left - 20) / values.length;
  const format = (value) =>
    value == null ? t("Unavailable") : number(value, metric === "usage_usd");
  return (
    <div className="chart-wrap" ref={chartRef}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t("Usage over time")}
      >
        <title>{t("Usage over time")}</title>
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
          <g key={fraction}>
            <line
              x1={left}
              x2={width - 16}
              y1={bottom - (bottom - top) * fraction}
              y2={bottom - (bottom - top) * fraction}
              className="gridline"
            />
            <text
              x={left - 12}
              y={bottom - (bottom - top) * fraction + 4}
              textAnchor="end"
              className="axis"
            >
              {format(maximum * fraction)}
            </text>
          </g>
        ))}
        {usage.buckets.map((bucket, i) => {
          const value = values[i];
          const barHeight =
            value == null ? 0 : (value / maximum) * (bottom - top);
          const x = left + i * step + step * 0.18;
          return (
            <g key={bucket.from}>
              <rect
                x={left + i * step}
                y={top}
                width={step}
                height={bottom - top}
                fill="transparent"
                className="chart-hit-area"
                tabIndex={0}
                id={chartId + "-" + i}
                data-bucket-index={i}
                aria-describedby={active === i ? tooltipId : undefined}
                role="button"
                aria-label={`${date(bucket.from)}: ${format(value)}${bucket.partial ? " " + t("Partial bucket") : ""}`}
                onFocus={(event) => show(event, bucket)}
                onBlur={hideTooltip}
                onMouseEnter={(event) => show(event, bucket)}
                onMouseMove={(event) => show(event, bucket)}
                onMouseLeave={hideTooltip}
                onPointerDown={(event) => {
                  touchPointer.current = event.pointerType === "touch";
                  if (touchPointer.current) show(event, bucket);
                }}
                onClick={(event) => inspect(event, bucket)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    hideTooltip();
                    onInspect(bucket);
                  }
                }}
              />
              <rect
                pointerEvents="none"
                x={x}
                y={bottom - Math.max(2, barHeight)}
                width={step * 0.64}
                height={Math.max(2, barHeight)}
                rx="3"
                className={bucket.partial ? "bar partial" : "bar"}
                opacity={active == null || active === i ? 1 : 0.45}
              />
              {(i === 0 ||
                i === values.length - 1 ||
                i % Math.ceil(values.length / 7) === 0) && (
                <text
                  x={x + step * 0.32}
                  y={bottom + 25}
                  textAnchor="middle"
                  className="axis"
                >
                  {date(bucket.from, true)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="chart-caption">
        <span>
          {t("Hover or focus a bar to inspect. All intervals are UTC.")}
        </span>
      </div>
    </div>
  );
}
