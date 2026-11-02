import { demoUsage, demoBalance } from "./demo";
/** One session-scoped client. No token or account data is stored on disk. */
export class ApiClient {
  constructor(token, demo = false) {
    this.token = token;
    this.demo = demo;
    this.history = [];
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
    const start = performance.now();
    const entry = {
      at: new Date().toISOString(),
      method: "GET",
      path: url,
      status: 0,
      duration: 0,
    };
    try {
      let data;
      if (this.demo && resource !== "openapi") {
        data =
          resource === "usage"
            ? demoUsage(query.range, query.scope)
            : resource === "balance"
              ? demoBalance
              : { status: "ok", version: "0.1.0" };
        entry.status = 200;
      } else {
        this.next[resource] = Date.now() + 6100;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Accept-Language": document.documentElement.lang,
          },
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(25000)])
            : AbortSignal.timeout(25000),
          cache: "no-store",
        });
        entry.status = response.status;
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
    } catch (error) {
      entry.error = error.message;
      throw error;
    } finally {
      entry.duration = Math.round(performance.now() - start);
      this.history = [entry, ...this.history].slice(0, 100);
    }
  }
  /** Erase all credentials and session records on logout. */
  clear() {
    this.token = "";
    this.cache.clear();
    this.history = [];
  }
}
