import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { metricValue } from "../utils/usage";

const TooltipContext = createContext(null);

/** A single chart overlay per authenticated workspace, rendered above clipping panels. */
export function ChartTooltipProvider({ children }) {
  const [tooltip, setTooltip] = useState(null);
  const tooltipId = useId();
  const showTooltip = useCallback(
    (event, content, dataElement = event.currentTarget) => {
      const owner = event.currentTarget;
      const rect = owner.getBoundingClientRect();
      const dataRect = dataElement.getBoundingClientRect();
      const keyboard = event.type === "focus";
      setTooltip({
        owner,
        dataElement,
        rect,
        content,
        x: keyboard ? dataRect.left + dataRect.width / 2 : event.clientX,
        y: keyboard ? dataRect.top : Math.min(event.clientY, dataRect.top),
      });
    },
    [],
  );
  const hideTooltip = useCallback((event) => {
    const owner = event?.currentTarget;
    setTooltip((current) => {
      if (owner && current?.owner !== owner) return current;
      if (event?.type === "mouseleave" && document.activeElement === owner)
        return current;
      return null;
    });
  }, []);
  useEffect(() => {
    const dismiss = (event) => {
      if (event.key === "Escape") hideTooltip();
    };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [hideTooltip]);
  const context = useMemo(
    () => ({
      showTooltip,
      hideTooltip,
      tooltipId,
      activeTarget: tooltip?.owner ?? null,
    }),
    [showTooltip, hideTooltip, tooltipId, tooltip?.owner],
  );
  return (
    <TooltipContext.Provider value={context}>
      {children}
      <ChartTooltip tooltip={tooltip} id={tooltipId} onDismiss={hideTooltip} />
    </TooltipContext.Provider>
  );
}

/** Shared chart interaction API; unmounting a chart dismisses stale data. */
export function useChartTooltip() {
  const context = useContext(TooltipContext);
  if (!context) throw new Error("Charts require ChartTooltipProvider");
  useEffect(() => () => context.hideTooltip(), [context.hideTooltip]);
  return context;
}

/** Localized, unabridged metrics and UTC times for every chart tooltip. */
export function useChartDetails() {
  const { t, i18n } = useTranslation();
  const formats = useMemo(
    () => ({
      count: new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 }),
      money: new Intl.NumberFormat(i18n.language, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      }),
      percent: new Intl.NumberFormat(i18n.language, {
        style: "percent",
        maximumFractionDigits: 2,
      }),
      time: new Intl.DateTimeFormat(i18n.language, {
        timeZone: "UTC",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }),
    }),
    [i18n.language],
  );
  const number = (value, currency = false) =>
    typeof value === "number" && Number.isFinite(value)
      ? (currency ? formats.money : formats.count).format(value)
      : t("Unavailable");
  const timestamp = (value) =>
    value ? formats.time.format(new Date(value)) + " UTC" : t("Unavailable");
  const period = (from, until) => timestamp(from) + " → " + timestamp(until);
  const usageRows = (container, model = "all", selected) =>
    [
      ["usage_usd", t("Usage cost")],
      ["request_count", t("Requests")],
      ["input_tokens", t("Input tokens")],
      ["cached_input_tokens", t("Cached input tokens")],
      ["output_tokens", t("Output tokens")],
    ].map(([key, label]) => ({
      label,
      value: number(metricValue(container, model, key), key === "usage_usd"),
      emphasis: key === selected,
    }));
  return {
    number,
    timestamp,
    period,
    usageRows,
    percent: (value) => formats.percent.format(value),
  };
}

function ChartTooltip({ tooltip, id, onDismiss }) {
  const ref = useRef(null);
  const [position, setPosition] = useState(null);
  const workspace = tooltip?.owner.closest(".main-shell");
  useLayoutEffect(() => {
    if (!tooltip || !ref.current || !workspace) {
      setPosition(null);
      return;
    }
    const update = () => {
      if (!tooltip.owner.isConnected) {
        onDismiss();
        return;
      }
      const bounds = (
        tooltip.owner.closest(".content") ?? workspace
      ).getBoundingClientRect();
      const left = Math.max(8, bounds.left + 8),
        right = Math.min(window.innerWidth - 8, bounds.right - 8);
      const top = Math.max(8, bounds.top + 8),
        bottom = Math.min(window.innerHeight - 8, bounds.bottom - 8);
      const ownerRect = tooltip.owner.getBoundingClientRect();
      const visible =
        ownerRect.bottom > top &&
        ownerRect.top < bottom &&
        ownerRect.right > left &&
        ownerRect.left < right;
      const width = Math.max(1, Math.min(340, right - left));
      ref.current.style.width = width + "px";
      ref.current.style.maxHeight = Math.max(1, bottom - top) + "px";
      const box = ref.current.getBoundingClientRect();
      const dataRect = tooltip.dataElement.getBoundingClientRect();
      const x = tooltip.x + ownerRect.left - tooltip.rect.left;
      const y = Math.min(
        tooltip.y + ownerRect.top - tooltip.rect.top,
        dataRect.top,
      );
      setPosition({
        left: Math.max(left, Math.min(x - box.width / 2, right - box.width)),
        top: Math.max(top, Math.min(y - box.height - 10, bottom - box.height)),
        width,
        maxHeight: Math.max(1, bottom - top),
        visible,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(workspace);
    observer.observe(ref.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [tooltip, workspace, onDismiss]);
  if (!tooltip || !workspace) return null;
  const { content } = tooltip;
  return createPortal(
    <div
      ref={ref}
      id={id}
      role="tooltip"
      className="chart-tooltip"
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        width: position?.width ?? 340,
        maxHeight: position?.maxHeight,
        visibility: position?.visible ? "visible" : "hidden",
      }}
    >
      <div className="chart-tooltip-title">{content.title}</div>
      <div className="chart-tooltip-time">{content.subtitle}</div>
      <dl>
        {content.rows.map((row, index) => (
          <div
            className={
              row.emphasis
                ? "chart-tooltip-row emphasized"
                : "chart-tooltip-row"
            }
            key={index}
          >
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {content.footer && (
        <div className="chart-tooltip-footer">{content.footer}</div>
      )}
    </div>,
    workspace,
  );
}
