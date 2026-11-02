import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  explorerOperations,
  explorerDefaults,
  explorerQuery,
  explorerPath,
} from "../utils/explorer";

/** OpenAPI-driven read-only request builder with independent per-operation query values. */
export default function ApiExplorer({ client, range, scope, onError }) {
  const { t } = useTranslation();
  const [operations, setOperations] = useState([]);
  const [resource, setResource] = useState("usage");
  const [valuesByResource, setValuesByResource] = useState({});
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    let live = true;
    client
      .request("openapi")
      .then((spec) => {
        const available = explorerOperations(spec);
        if (!available.length) throw new Error("No supported operations");
        if (live) {
          setOperations(available);
          setResource((current) =>
            available.some((item) => item.resource === current)
              ? current
              : available[0].resource,
          );
        }
      })
      .catch(() => {
        if (live) {
          setFallback(true);
          setOperations(explorerOperations());
        }
      });
    return () => {
      live = false;
    };
  }, [client]);
  const operation = operations.find((item) => item.resource === resource);
  const values = {
    ...explorerDefaults(operation, { range, scope }),
    ...(valuesByResource[resource] ?? {}),
  };
  const query = explorerQuery(operation, values);
  const preview = explorerPath(operation, query);
  function clearResult() {
    setResponse(null);
    setError("");
  }
  function updateValue(name, value) {
    setValuesByResource((current) => ({
      ...current,
      [resource]: { ...current[resource], [name]: value },
    }));
    clearResult();
  }
  async function execute(event) {
    event.preventDefault();
    if (!operation || loading) return;
    setLoading(true);
    clearResult();
    try {
      setResponse(await client.request(resource, query, { force: true }));
    } catch (err) {
      setError(err.message === "rateLimited" ? "rateLimited" : "requestFailed");
      onError(err);
    } finally {
      setLoading(false);
    }
  }
  function parameterLabel(name) {
    if (name === "range") return t("Timeframe");
    if (name === "scope") return t("Scope");
    if (name === "group_by") return t("Group by");
    return name;
  }
  function optionLabel(value) {
    switch (value) {
      case "24h":
        return t("24 hours");
      case "7d":
        return t("7 days");
      case "30d":
        return t("30 days");
      case "self":
        return t("My usage");
      case "team":
        return t("Team usage");
      case "model":
        return t("Model");
      default:
        return value;
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t("API explorer")}</h1>
          <p>
            {t(
              "Execute read-only operations with your current bearer session.",
            )}
          </p>
        </div>
      </div>
      <section className="panel explorer">
        <p>
          {t(
            fallback
              ? "Bundled fallback: the server OpenAPI document could not be loaded."
              : "Operations loaded from the monitor OpenAPI contract.",
          )}
        </p>
        <form onSubmit={execute}>
          <div className="explorer-controls">
            <span className="method">GET</span>
            <select
              aria-label={t("Operation")}
              value={resource}
              disabled={loading}
              onChange={(event) => {
                setResource(event.target.value);
                clearResult();
              }}
            >
              {operations.map((item) => (
                <option value={item.resource} key={item.resource}>
                  {item.resource}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="primary"
              disabled={loading || !operation}
            >
              {t(loading ? "Loading…" : "Execute")}
            </button>
          </div>
          {operation && (
            <fieldset className="explorer-query" disabled={loading}>
              <legend>{t("Query parameters")}</legend>
              {operation.parameters.length ? (
                <>
                  <p>
                    {t(
                      "Edit values for this request. Changes do not affect overview filters.",
                    )}
                  </p>
                  <div className="explorer-parameters">
                    {operation.parameters.map((parameter) => (
                      <div className="explorer-parameter" key={parameter.name}>
                        <label htmlFor={`explorer-${parameter.name}`}>
                          {parameterLabel(parameter.name)}{" "}
                          <code>{parameter.name}</code>
                        </label>
                        {parameter.schema?.enum ? (
                          <select
                            id={`explorer-${parameter.name}`}
                            value={values[parameter.name] ?? ""}
                            required={parameter.required === true}
                            onChange={(event) =>
                              updateValue(parameter.name, event.target.value)
                            }
                          >
                            {!parameter.required && (
                              <option value="">
                                {t("Default (omit parameter)")}
                              </option>
                            )}
                            {parameter.schema.enum.map((value) => (
                              <option value={value} key={value}>
                                {optionLabel(value)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={`explorer-${parameter.name}`}
                            value={values[parameter.name] ?? ""}
                            required={parameter.required === true}
                            type={
                              parameter.schema?.type === "integer" ||
                              parameter.schema?.type === "number"
                                ? "number"
                                : "text"
                            }
                            onChange={(event) =>
                              updateValue(parameter.name, event.target.value)
                            }
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p>{t("This endpoint has no query parameters.")}</p>
              )}
            </fieldset>
          )}
        </form>
        <code className="explorer-preview" aria-label={t("Request URL")}>
          {preview}
        </code>
        {error && (
          <p role="alert" className="notice error">
            {t(error)}
          </p>
        )}
        <pre className={response ? undefined : "response-placeholder"}>
          {response
            ? JSON.stringify(response, null, 2)
            : t("Execute a request to inspect its JSON response.")}
        </pre>
      </section>
    </>
  );
}
