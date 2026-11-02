import { useId } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { useChartDetails, useChartTooltip } from "./ChartTooltip";

/** Model-share bars with the same workspace-contained details as the time series. */
export default function ModelBreakdown({ usage, rows, number, onSelect }) {
  const { t } = useTranslation();
  const details = useChartDetails();
  const { showTooltip, hideTooltip, tooltipId, activeTarget } =
    useChartTooltip();
  const prefix = useId();
  function show(event, group) {
    const track = event.currentTarget.querySelector(".model-track");
    const rows = details.usageRows(group, "all", "usage_usd");
    if (typeof group.usage_usd === "number" && usage.totals.usage_usd > 0)
      rows[0].value +=
        " · " + details.percent(group.usage_usd / usage.totals.usage_usd);
    showTooltip(
      event,
      {
        title: group.model,
        subtitle: details.period(usage.from, usage.until),
        rows,
      },
      track?.getBoundingClientRect().width ? track : event.currentTarget,
    );
  }
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{t("Model breakdown")}</h2>
          <p>
            {t(
              "Top models for the selected timeframe. Filter locally within the returned groups.",
            )}
          </p>
        </div>
        <NavLink to="/dashboard/models">
          {t("View all")}
          <ArrowUpRight size={15} />
        </NavLink>
      </div>
      {rows.slice(0, 4).map((group, index) => {
        const id = prefix + "-" + index;
        return (
          <button
            className="model-row"
            key={group.model}
            id={id}
            aria-describedby={activeTarget?.id === id ? tooltipId : undefined}
            onMouseEnter={(event) => show(event, group)}
            onMouseMove={(event) => show(event, group)}
            onMouseLeave={hideTooltip}
            onFocus={(event) => show(event, group)}
            onBlur={hideTooltip}
            onPointerDown={(event) => {
              if (event.pointerType === "touch") show(event, group);
            }}
            onClick={() =>
              onSelect(
                group.model === t("Other models") ? "remainder" : group.model,
              )
            }
          >
            <span className={`model-swatch swatch-${index % 3}`} />
            <span className="model-name">
              {group.model}
              <small>
                {number(group.request_count)} {t("Requests")}
              </small>
            </span>
            <div className="model-track">
              <span
                style={{
                  width: `${usage.totals.usage_usd ? Math.min(100, ((group.usage_usd ?? 0) / usage.totals.usage_usd) * 100) : 0}%`,
                }}
              />
            </div>
            <strong>{number(group.usage_usd, true)}</strong>
            <ChevronRight size={15} />
          </button>
        );
      })}
      {!rows.length && <div className="empty">{t("No records found")}</div>}
    </section>
  );
}
