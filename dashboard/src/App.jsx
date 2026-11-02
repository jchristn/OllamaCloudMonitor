import { useEffect, useMemo, useRef, useState } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Box,
  ChevronRight,
  CircleHelp,
  Cloud,
  Code2,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Github,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import { locales } from "./i18n";
import { ApiClient } from "./utils/api";
import {
  availableBalance,
  metricValue,
  selectMetrics,
  usageCsv,
} from "./utils/usage";
import { DataTable, JsonModal, CopyButton } from "./components/Primitives";
import UsageChart from "./components/UsageChart";
import ApiExplorer from "./views/ApiExplorer";
const repo = "https://github.com/jchristn/OllamaCloudMonitor";
/** Main application shell and session lifecycle. */
export default function App() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [token, setToken] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(
    localStorage.getItem("monitor.theme") ?? "light",
  );
  const [auto, setAuto] = useState(
    localStorage.getItem("monitor.auto") !== "false",
  );
  const [range, setRange] = useState("7d");
  const [scope, setScope] = useState("self");
  const [model, setModel] = useState("all");
  const [metric, setMetric] = useState("usage_usd");
  const [usage, setUsage] = useState(null);
  const [balance, setBalance] = useState(null);
  const [balanceError, setBalanceError] = useState("");
  const [updated, setUpdated] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [detail, setDetail] = useState(null);
  const [menu, setMenu] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const session = useRef(null);
  const [configuredAccount, setConfiguredAccount] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    new ApiClient("")
      .request("health", {}, { signal: controller.signal })
      .then((health) =>
        setConfiguredAccount(health.configured_account === true),
      )
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("monitor.theme", theme);
  }, [theme]);
  useEffect(() => {
    document.title = t("Ollama Cloud Monitor");
  }, [t]);
  useEffect(() => {
    localStorage.setItem("monitor.auto", String(auto));
  }, [auto]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const clearOnLeave = () => {
      client?.clear();
      session.current = null;
      setClient(null);
      setToken("");
      setUsage(null);
      setBalance(null);
      setUpdated(null);
      setDetail(null);
    };
    window.addEventListener("pagehide", clearOnLeave);
    return () => window.removeEventListener("pagehide", clearOnLeave);
  }, [client]);
  const number = (value, currency = false) =>
    value == null
      ? t("Unavailable")
      : new Intl.NumberFormat(i18n.language, {
          ...(currency
            ? {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              }
            : {
                notation: Math.abs(value) > 999999 ? "compact" : "standard",
                maximumFractionDigits: 0,
              }),
        }).format(value);
  const date = (value, short = false) =>
    new Intl.DateTimeFormat(i18n.language, {
      timeZone: "UTC",
      ...(short
        ? range === "24h"
          ? { hour: "2-digit" }
          : { month: "short", day: "numeric" }
        : {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
    }).format(new Date(value));
  function logout() {
    session.current?.clear();
    session.current = null;
    client?.clear();
    setClient(null);
    setToken("");
    setUsage(null);
    setBalance(null);
    setUpdated(null);
    setError("");
    setBalanceError("");
    setDetail(null);
    setRetryAt(0);
    navigate("/");
  }
  function handleError(err) {
    if (err.name === "AbortError") return;
    if (err.status === 401) {
      logout();
      setError("unauthorized");
      return;
    }
    setError(
      err.message in
        { rateLimited: 1, forbidden: 1, requestFailed: 1, invalidResponse: 1 }
        ? err.message
        : "networkError",
    );
    if (err.retryAt) setRetryAt(err.retryAt);
  }
  async function login(event, demo = false, configured = false) {
    event?.preventDefault();
    setError("");
    setBusy(true);
    const api = new ApiClient(
      demo || configured ? "" : token.trim().replace(/^Bearer\s+/i, ""),
      demo,
    );
    try {
      await api.request("usage", { range, scope: "self", group_by: "model" });
      session.current = api;
      setClient(api);
      setToken("");
      setScope("self");
      setModel("all");
      navigate("/dashboard/home");
    } catch (err) {
      api.clear();
      handleError(err);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!client) return;
    const controller = new AbortController();
    let live = true;
    setBusy(true);
    setUsage(null);
    setError("");
    setModel("all");
    client
      .request(
        "usage",
        { range, scope, group_by: "model" },
        { signal: controller.signal },
      )
      .then((data) => {
        if (live) {
          setUsage(data);
          setUpdated(new Date());
        }
      })
      .catch((err) => {
        if (live) handleError(err);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    client
      .request("balance", {}, { signal: controller.signal })
      .then((data) => {
        if (live) {
          setBalance(data);
          setBalanceError("");
        }
      })
      .catch((err) => {
        if (live) {
          if (err.status === 401) handleError(err);
          else {
            setBalance(null);
            setBalanceError(
              err.message === "rateLimited" ? "rateLimited" : "balanceFailed",
            );
            if (err.retryAt) setRetryAt(err.retryAt);
          }
        }
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [client, range, scope, refresh]);
  useEffect(() => {
    if (!client || !auto) return;
    const id = setInterval(() => {
      if (!document.hidden && !busy && Date.now() > retryAt)
        setRefresh((n) => n + 1);
    }, 60000);
    return () => clearInterval(id);
  }, [client, auto, busy, retryAt]);

  const metrics = usage
    ? Object.fromEntries(
        [
          "usage_usd",
          "request_count",
          "input_tokens",
          "output_tokens",
          "cached_input_tokens",
        ].map((key) => [key, metricValue(usage.totals, model, key)]),
      )
    : {};
  const controls = (
    <>
      <label className="language">
        <span className="sr-only">{t("Language")}</span>
        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
        >
          {locales.map((locale) => (
            <option value={locale.code} key={locale.code}>
              {locale.name}
            </option>
          ))}
        </select>
      </label>
      <button
        className="icon"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        aria-label={t("Toggle theme")}
      >
        {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      </button>
    </>
  );
  const notice = (key) => (
    <div role="alert" className="notice error">
      <CircleHelp size={18} />
      <div>
        {t(key)}
        {retryAt > now && (
          <div>
            {t("Retry in {{seconds}} seconds", {
              seconds: Math.ceil((retryAt - now) / 1000),
            })}
          </div>
        )}
      </div>
    </div>
  );
  const navigation = [
    { path: "home", label: "Overview", icon: BarChart3 },
    { path: "models", label: "Models", icon: Box },
    { path: "api-explorer", label: "API explorer", icon: Code2 },
    { path: "settings", label: "Settings", icon: Settings },
  ];
  const download = () => {
    if (!usage) return;
    const url = URL.createObjectURL(
      new Blob([usageCsv(usage, model)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `ollama-usage-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const refreshData = () => {
    if (!client || busy || retryAt > now) return;
    client.cache.clear();
    setRefresh((n) => n + 1);
  };
  const modelRows = useMemo(
    () =>
      usage
        ? [
            ...(usage.totals.groups ?? []),
            ...(usage.totals.remainder
              ? [{ model: t("Other models"), ...usage.totals.remainder }]
              : []),
          ]
        : [],
    [usage, t],
  );
  if (!client)
    return (
      <>
        <div className="login-top">
          <a className="brand" href="/">
            <img src="/assets/ollama.png" alt="Ollama" />
            <span>
              Ollama <b>Cloud Monitor</b>
            </span>
          </a>
          <div className="utilities">
            {controls}
            <a href={repo} aria-label={t("GitHub repository")}>
              <Github size={19} />
            </a>
          </div>
        </div>
        <main className="login-layout">
          <section className="login-story">
            <div className="eyebrow">
              <span className="status-dot" />
              {t("A clearer view of your cloud")}
            </div>
            <h1>
              {t("Your models.")}
              <br />
              <span>{t("Your usage.")}</span>
              <br />
              {t("All in view.")}
            </h1>
            <p>
              {t(
                "Understand your Ollama Cloud activity, track spending, and keep your credits in sight.",
              )}
            </p>
            <div className="login-features">
              <span>
                <Activity size={17} />
                {t("Usage by model")}
              </span>
              <span>
                <Wallet size={17} />
                {t("Live credit balance")}
              </span>
              <span>
                <ShieldCheck size={17} />
                {t("Private by design")}
              </span>
            </div>
            <div className="story-foot">
              <Cloud size={20} />
              <span>{t("Built for Ollama Cloud")}</span>
              <span className="tag">v0.1.0</span>
            </div>
          </section>
          <section className="login-card">
            <div className="key-icon">
              <KeyRound size={25} />
            </div>
            <h2>{t("Connect your account")}</h2>
            <p>{t("Use your Ollama API key to open your dashboard.")}</p>
            {configuredAccount && (
              <div className="notice configured-account">
                <div>
                  <p>
                    {t(
                      "A server-side Ollama account is configured. Anyone with access to this monitor can view its usage.",
                    )}
                  </p>
                  <button
                    type="button"
                    className="primary"
                    disabled={busy || retryAt > now}
                    onClick={() => login(null, false, true)}
                  >
                    {t("Open configured account")}
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={login}>
              <label htmlFor="token">{t("Bearer token")}</label>
              <div className="token-field">
                <input
                  id="token"
                  name="token"
                  type={visible ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={t("Enter your Ollama API key")}
                  required
                  autoComplete="off"
                  spellCheck="false"
                />
                <button
                  type="button"
                  onClick={() => setVisible(!visible)}
                  aria-label={t(visible ? "Hide token" : "Show token")}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="field-hint">
                {t(
                  "Your token stays in memory and is cleared when you leave or sign out.",
                )}
              </p>
              {error && notice(error)}
              <button
                className="primary connect"
                disabled={busy || retryAt > now || !token.trim()}
              >
                {busy ? t("Connecting…") : t("Open dashboard")}
                <ChevronRight size={18} />
              </button>
            </form>
            <div className="divider">
              <span>{t("Just exploring?")}</span>
            </div>
            <button
              className="demo-button"
              disabled={busy}
              onClick={() => login(null, true)}
            >
              {t("Explore demo dashboard")}
              <ArrowUpRight size={17} />
            </button>
            <div className="secure-note">
              <ShieldCheck size={17} />
              <span>
                {configuredAccount
                  ? t("Configured token stays on the server.")
                  : t("Read-only access. No token storage. No tracking.")}
              </span>
            </div>
            <a
              className="key-link"
              href="https://ollama.com/settings/keys"
              target="_blank"
              rel="noreferrer"
            >
              {t("Get an Ollama API key")}
              <ExternalLink size={13} />
            </a>
          </section>
        </main>
        <footer className="login-footer">
          {t("Independent open-source project. Not affiliated with Ollama.")}
          <a
            href="https://docs.ollama.com/api/cloud-usage"
            target="_blank"
            rel="noreferrer"
          >
            {t("API documentation")}
            <ExternalLink size={13} />
          </a>
        </footer>
      </>
    );
  const filters = (
    <div className="filters">
      <div className="segmented" aria-label={t("Timeframe")}>
        {[
          ["24h", "24 hours"],
          ["7d", "7 days"],
          ["30d", "30 days"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={range === value ? "active" : ""}
            disabled={busy}
            onClick={() => setRange(value)}
          >
            {t(label)}
          </button>
        ))}
      </div>
      <label>
        <span>{t("Scope")}</span>
        <select
          value={scope}
          disabled={busy}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="self">{t("My usage")}</option>
          <option value="team">{t("Team usage")}</option>
        </select>
      </label>
      <label className="model-filter">
        <span>{t("Model")}</span>
        <select value={model} onChange={(e) => setModel(e.target.value)}>
          <option value="all">{t("All models")}</option>
          {usage?.totals.groups?.map((group) => (
            <option key={group.model}>{group.model}</option>
          ))}
          {usage?.totals.remainder && (
            <option value="remainder">{t("Other models")}</option>
          )}
        </select>
      </label>
      <button className="export" onClick={download} disabled={!usage}>
        <Download size={15} />
        {t("Export CSV")}
      </button>
    </div>
  );
  const overview = (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t("YOUR CLOUD, AT A GLANCE")}</div>
          <h1>{t("Usage overview")}</h1>
          <p>{t("Monitor activity. Understand costs. Stay in control.")}</p>
        </div>
        <span className="utc-badge">UTC</span>
      </div>
      {filters}
      {error && notice(error)}
      {balanceError && notice(balanceError)}
      <div className="kpi-grid">
        <article className="kpi">
          <div>
            <span>{t("Usage cost")}</span>
            <Activity size={17} />
          </div>
          <strong>{number(metrics.usage_usd, true)}</strong>
          <small>{t("Selected timeframe and model")}</small>
        </article>
        <article className="kpi">
          <div>
            <span>{t("Requests")}</span>
            <ArrowUpRight size={17} />
          </div>
          <strong>{number(metrics.request_count)}</strong>
          <small>{t("Selected timeframe and model")}</small>
        </article>
        <article className="kpi">
          <div>
            <span>{t("Total tokens")}</span>
            <Box size={17} />
          </div>
          <strong>
            {number(
              metrics.input_tokens == null || metrics.output_tokens == null
                ? null
                : metrics.input_tokens + metrics.output_tokens,
            )}
          </strong>
          <small>{t("Input + output; cached input included")}</small>
        </article>
        <article className="kpi balance-kpi">
          <div>
            <span>{t("Available balance")}</span>
            <Wallet size={17} />
          </div>
          <strong>{number(availableBalance(balance), true)}</strong>
          <small>{t("Current shared account balance")}</small>
        </article>
      </div>
      <div className="overview-grid">
        <section className="panel usage-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("Usage over time")}</h2>
              <p>
                {usage
                  ? `${date(usage.from)} → ${date(usage.until)} UTC`
                  : t(busy ? "Loading…" : "No data loaded")}
              </p>
            </div>
            <select
              aria-label={t("Chart metric")}
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
            >
              {[
                ["usage_usd", "Cost (USD)"],
                ["request_count", "Requests"],
                ["input_tokens", "Input tokens"],
                ["cached_input_tokens", "Cached input tokens"],
                ["output_tokens", "Output tokens"],
              ].map(([value, label]) => (
                <option value={value} key={value}>
                  {t(label)}
                </option>
              ))}
            </select>
          </div>
          {busy ? (
            <div className="empty">{t("Loading…")}</div>
          ) : usage ? (
            <>
              {metrics[metric] == null ? (
                <div className="empty">
                  {t("This metric is unavailable for legacy plan usage.")}
                </div>
              ) : (
                <UsageChart
                  usage={usage}
                  model={model}
                  metric={metric}
                  number={number}
                  date={date}
                  onInspect={setDetail}
                />
              )}
              {metrics.request_count === 0 && (
                <p className="notice">
                  {t("No usage in this timeframe. Try another range or scope.")}
                </p>
              )}
            </>
          ) : (
            <div className="empty">
              <p>{t("No data loaded")}</p>
              <button disabled={retryAt > now} onClick={refreshData}>
                {t("Retry")}
              </button>
            </div>
          )}
        </section>
        <BalancePanel balance={balance} number={number} date={date} />
      </div>
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
        {modelRows.slice(0, 4).map((group, i) => (
          <button
            className="model-row"
            key={group.model}
            onClick={() =>
              setModel(
                group.model === t("Other models") ? "remainder" : group.model,
              )
            }
          >
            <span className={`model-swatch swatch-${i % 3}`} />
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
        ))}
        {!modelRows.length && (
          <div className="empty">{t("No records found")}</div>
        )}
      </section>
      <div className="footnotes">
        <span>
          <CircleHelp size={14} />
          {t("Usage may be delayed. The final bucket is still in progress.")}
        </span>
        <a
          href="https://docs.ollama.com/api/cloud-usage"
          target="_blank"
          rel="noreferrer"
        >
          {t("How usage is measured")}
          <ExternalLink size={12} />
        </a>
      </div>
    </>
  );
  return (
    <div className="app-shell">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <a className="brand" href="/dashboard/home">
          <img src="/assets/ollama.png" alt="Ollama" />
          <span>
            Ollama<b>Cloud Monitor</b>
          </span>
        </a>
        <span className="nav-heading">{t("WORKSPACE")}</span>
        <nav>
          {navigation.map((item) => (
            <NavLink
              to={"/dashboard/" + item.path}
              onClick={() => setMenu(false)}
              key={item.path}
            >
              <item.icon size={18} />
              {t(item.label)}
              <ChevronRight className="nav-arrow" size={14} />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a
            href="https://docs.ollama.com/api/cloud-usage"
            target="_blank"
            rel="noreferrer"
          >
            <CircleHelp size={16} />
            {t("Documentation")}
            <ExternalLink size={13} />
          </a>
          <div className="version">
            v0.1.0 <span>{t("Open source")}</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu icon"
            aria-label={t("Toggle navigation")}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="breadcrumbs">
            {t("Workspace")}
            <ChevronRight size={13} />
            <span>{t("Cloud activity")}</span>
          </div>
          <div className="utilities">
            <span className="live-status">
              <span className="status-dot" />
              {t(client.demo ? "Demo mode" : "Connected")}
            </span>
            {controls}
            <a href={repo} aria-label={t("GitHub repository")}>
              <Github size={18} />
            </a>
            <button
              className="icon"
              onClick={logout}
              aria-label={t("Sign out")}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        {client.demo && (
          <div className="demo-banner">
            {t("Demo mode: all usage and balance values are synthetic.")}
            <button onClick={logout}>
              {t("Connect real account")}
              <ArrowUpRight size={14} />
            </button>
          </div>
        )}
        <main className="content">
          <div className="refresh-line">
            <span>
              {updated
                ? `${t("Updated")} ${date(updated)} UTC`
                : t("Awaiting data")}
            </span>
            <button disabled={busy || retryAt > now} onClick={refreshData}>
              <RefreshCw size={14} className={busy ? "spinning" : ""} />
              {t("Refresh")}
            </button>
          </div>
          <Routes>
            <Route path="/dashboard/home" element={overview} />
            <Route
              path="/dashboard/models"
              element={
                <>
                  <PageTitle
                    title="Models"
                    description="Compare the returned model groups. Ollama returns at most ten named models, plus other models."
                  />
                  {filters}
                  {error && notice(error)}
                  <section className="panel">
                    <DataTable
                      rows={modelRows}
                      searchKey="model"
                      columns={[
                        { key: "model", label: "Model" },
                        {
                          key: "usage_usd",
                          label: "Cost (USD)",
                          render: (value) => number(value, true),
                        },
                        {
                          key: "request_count",
                          label: "Requests",
                          render: (value) => number(value),
                        },
                        {
                          key: "input_tokens",
                          label: "Input tokens",
                          render: (value) => number(value),
                        },
                        {
                          key: "output_tokens",
                          label: "Output tokens",
                          render: (value) => number(value),
                        },
                      ]}
                    />
                  </section>
                </>
              }
            />
            <Route
              path="/dashboard/api-explorer"
              element={
                <ApiExplorer
                  client={client}
                  range={range}
                  scope={scope}
                  onError={handleError}
                  number={number}
                />
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <>
                  <PageTitle
                    title="Settings"
                    description="Browser preferences and deployment information."
                  />
                  <section className="panel settings-panel">
                    <h2>{t("Preferences")}</h2>
                    <div className="setting-row">
                      <div>
                        <b>{t("Automatic refresh")}</b>
                        <p>
                          {t(
                            "Refresh once per minute while this tab is visible.",
                          )}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        aria-label={t("Automatic refresh")}
                        checked={auto}
                        onChange={(e) => setAuto(e.target.checked)}
                      />
                    </div>
                    <div className="setting-row">
                      <b>{t("Language and appearance")}</b>
                      <div className="utilities">{controls}</div>
                    </div>
                    <h2>{t("Server information")}</h2>
                    <div className="setting-row">
                      <span>{t("Ollama endpoint")}</span>
                      <code>https://ollama.com</code>
                      <CopyButton value="https://ollama.com" />
                    </div>
                    <div className="setting-row">
                      <span>{t("Version")}</span>
                      <code>0.1.0</code>
                    </div>
                    <p>
                      {t(
                        "The proxy is read-only. Deployment configuration uses environment variables; server restart and mutable billing settings are not exposed.",
                      )}
                    </p>
                    <div className="notice">
                      <ShieldCheck size={18} />
                      {t(
                        "Your token stays in memory and is cleared when you leave or sign out.",
                      )}
                    </div>
                    <a href={repo}>
                      {t("GitHub repository")}
                      <ExternalLink size={14} />
                    </a>
                  </section>
                </>
              }
            />
            <Route
              path="*"
              element={<Navigate to="/dashboard/home" replace />}
            />
          </Routes>
        </main>
        <footer className="app-footer">
          <span>
            Ollama Cloud Monitor <span className="muted">/</span> v0.1.0
          </span>
          <span>{t("Independent project. Powered by the Ollama API.")}</span>
        </footer>
      </div>
      {detail && <JsonModal value={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
function PageTitle({ title, description }) {
  const { t } = useTranslation();
  return (
    <div className="page-heading">
      <div>
        <h1>{t(title)}</h1>
        <p>{t(description)}</p>
      </div>
    </div>
  );
}
function BalancePanel({ balance, number, date }) {
  const { t } = useTranslation();
  const included = balance?.included;
  const allowance = included?.allowance_usd;
  const remaining = included?.balance_usd;
  const percent =
    allowance > 0 && remaining != null
      ? Math.min(100, Math.max(0, (remaining / allowance) * 100))
      : null;
  return (
    <section className="panel credit-panel">
      <div className="panel-heading">
        <h2>{t("Credit balance")}</h2>
        <Wallet size={18} />
      </div>
      <p>{t("Current account-wide credits")}</p>
      <div className="credit-total">
        {number(availableBalance(balance), true)}
      </div>
      <div className="credit-item">
        <span>{t("Included remaining")}</span>
        <b>{number(remaining, true)}</b>
      </div>
      {percent != null && (
        <>
          <progress
            max="100"
            value={percent}
            aria-label={t("Included credits remaining")}
          />
          <small>
            {t("of {{amount}} allowance", { amount: number(allowance, true) })}
          </small>
        </>
      )}
      {included?.period?.until && (
        <p className="reset">
          {t("Resets")} {date(included.period.until)} UTC
        </p>
      )}
      <div className="credit-item purchased">
        <span>{t("Purchased credits")}</span>
        <b>{number(balance?.purchased?.balance_usd, true)}</b>
      </div>
      {["session", "weekly"].map(
        (key) =>
          included?.[key] && (
            <div key={key} className="legacy">
              <b>{t(key === "session" ? "Session limit" : "Weekly limit")}</b>
              <span>
                {new Intl.NumberFormat(document.documentElement.lang, {
                  style: "percent",
                }).format(included[key].remaining_percent / 100)}{" "}
                {t("remaining")}
              </span>
              <small>
                {t("Resets")} {date(included[key].resets_at)} UTC
              </small>
            </div>
          ),
      )}
      <div className="credit-note">
        <CircleHelp size={14} />
        {t(
          "Balance is shared across models and team members. Historical balances are not provided by the API.",
        )}
      </div>
    </section>
  );
}
