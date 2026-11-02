import { demoUsage, demoBalance } from "./demo";
/** One session-scoped client. No token or account data is stored on disk. */
export class ApiClient {
  constructor(token, demo = false) {
    this.token = token;
    this.demo = demo;
    this.cache = new Map();
    this.next = {};
    this.blockedUntil = 0;
  }
  /** Fetch an allowlisted operation, preserving a shared per-endpoint rate budget. */
  async request(resource, query = {}, { signal, force = false } = {}) {
    const path =
      resource === "openapi" ? "/openapi.json" : `/v1.0/api/${resource}`;
    const url =
      path +
      (Object.keys(query).length ? "?" + new URLSearchParams(query) : "");
    const cached = this.cache.get(url);
    if (!force && cached && Date.now() - cached.time < 60000)
      return cached.data;
    if (Date.now() < this.blockedUntil) {
      throw Object.assign(new Error("rateLimited"), {
        retryAt: this.blockedUntil,
      });
    }
    const delay = (this.next[resource] ?? 0) - Date.now();
    if (delay > 0 && !this.demo)
      await new Promise((resolve, reject) => {
        const id = setTimeout(resolve, delay);
        if (signal?.aborted) {
          clearTimeout(id);
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(id);
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      });
    let data;
    if (this.demo && resource !== "openapi") {
      data =
        resource === "usage"
          ? demoUsage(query.range, query.scope)
          : resource === "balance"
            ? demoBalance
            : { status: "ok", version: "0.1.0" };
    } else {
      this.next[resource] = Date.now() + 6100;
      const response = await fetch(url, {
        headers: {
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          "Accept-Language": document.documentElement.lang,
        },
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(25000)])
          : AbortSignal.timeout(25000),
        cache: "no-store",
      });
      if (response.status === 429) {
        const retry = response.headers.get("Retry-After");
        const seconds = Number(retry);
        this.blockedUntil =
          Number.isFinite(seconds) && seconds > 0
            ? Date.now() + seconds * 1000
            : Math.max(Date.now() + 60000, Date.parse(retry) || 0);
        throw Object.assign(new Error("rateLimited"), {
          retryAt: this.blockedUntil,
        });
      }
      if (!response.ok)
        throw Object.assign(
          new Error(
            response.status === 401
              ? "unauthorized"
              : response.status === 403
                ? "forbidden"
                : "requestFailed",
          ),
          { status: response.status },
        );
      data = await response.json();
      if (
        resource === "usage" &&
        (!Array.isArray(data.buckets) || !data.totals)
      )
        throw new Error("invalidResponse");
    }
    this.cache.set(url, { time: Date.now(), data });
    return data;
  }

  /** Erase credentials and cached account data on logout. */
  clear() {
    this.token = "";
    this.cache.clear();
  }
}
