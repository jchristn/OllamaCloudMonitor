# REST API

Base URL: `http://127.0.0.1:8080`. The same listener serves the built dashboard and the following read-only API. The canonical machine-readable contract is [monitor.openapi.json](postman/specs/monitor.openapi.json); it is also served at `/openapi.json`. The runnable [Postman collection](postman/collections/monitor) uses `baseUrl` and `bearerToken` variables. Set real tokens in a private Postman environment or secret variable, never a committed file or command line.

## Common behavior

Only GET is supported for the documented routes. There are no path parameters or request bodies. Proxy responses use `Content-Type: application/json` and `Cache-Control: no-store`. CORS is not enabled. Unknown routes and unsupported methods return 404; OPTIONS returns 405. HTTP upstream redirects are rejected. Upstream base URL is deployment configuration, never caller-controlled.

Usage and balance require `Authorization: Bearer <Ollama API key>`. Ollama validates the token and enforces account and team access on every forwarded request. The proxy does not mint tokens, create accounts or elevate privileges. Health and OpenAPI are anonymous. A successful token login in the UI means `/usage` was successfully fetched; it does not create a server session.

Common proxy errors return `{ "error": "stable_code" }`:

| Status | Error | Meaning |
| --- | --- | --- |
| 400 | `invalid_query` | Unsupported, invalid, empty or repeated query parameter |
| 401 | `unauthorized` or `upstream_401` | Missing/malformed bearer header or Ollama rejected the key |
| 403 | `upstream_403` | Ollama denied the requested scope |
| 429 | `upstream_429` | Rate limit; the upstream `Retry-After` header is preserved |
| 500 | `upstream_500` | Ollama internal error, sanitized by the proxy |
| 502 | `upstream_unavailable`, `upstream_invalid_response`, `upstream_redirect` | Network error, unexpected content type, or redirect |
| 504 | `upstream_timeout` | Upstream headers or body exceeded the 20-second timeout |

Other upstream error statuses are preserved with `upstream_<status>` and their body is sanitized. No automatic request retries occur. Ollama documents 10 requests/minute/user for each endpoint, shared across keys and devices. The browser caches each query for 60 seconds, spaces new calls to each resource by at least 6.1 seconds, offers optional one-minute foreground polling, and observes Retry-After. Other tabs/devices can still consume the upstream quota.

## GET /v1.0/api/health

Anonymous liveness. No parameters. It does not call Ollama and does not establish upstream readiness.

```json
{"status":"ok","version":"0.1.0","upstream":"https://ollama.com"}
```

Status: 200.

## GET /openapi.json

Anonymous OpenAPI 3.0.3 document. No parameters. Returns the complete contract as JSON. Statuses: 200; 503 with `{"error":"contract_unavailable"}` if the deployment omitted the file.

## GET /v1.0/api/usage

Authenticated usage proxy to `https://ollama.com/api/usage`. Parameters:

| Name | Required | Allowed values | Default | Meaning |
| --- | --- | --- | --- | --- |
| `range` | No | `24h`, `7d`, `30d` | `7d` | Completed UTC hours/days plus current partial bucket |
| `scope` | No | `self`, `team` | `self` | Team scope requires Ollama team administrator |
| `group_by` | No | `model` | `model` | Monitor always requests model grouping |

Statuses: 200, common proxy errors above. Custom from/until dates and server-side model filters are unsupported. Model filtering in the dashboard is local to the fetched response.

```sh
curl 'http://127.0.0.1:8080/v1.0/api/usage?range=7d&scope=self&group_by=model' \
  -H "Authorization: Bearer $OLLAMA_API_KEY"
```

The 200 body passes through Ollama JSON unchanged. Shape (illustrative single bucket):

```json
{
  "range":"7d", "scope":"self", "group_by":"model", "granularity":"day",
  "from":"2026-11-01T00:00:00Z", "until":"2026-11-01T12:00:00Z",
  "totals":{
    "request_count":4, "usage_usd":0.02,
    "input_tokens":2000, "cached_input_tokens":500, "output_tokens":300,
    "groups":[{"model":"gpt-oss:120b","request_count":4,"usage_usd":0.02,"input_tokens":2000,"cached_input_tokens":500,"output_tokens":300}]
  },
  "buckets":[{
    "from":"2026-11-01T00:00:00Z", "until":"2026-11-01T12:00:00Z", "partial":true,
    "request_count":4,"usage_usd":0.02,"input_tokens":2000,"cached_input_tokens":500,"output_tokens":300,
    "groups":[{"model":"gpt-oss:120b","request_count":4,"usage_usd":0.02,"input_tokens":2000,"cached_input_tokens":500,"output_tokens":300}]
  }]
}
```

Real 24h/7d/30d responses contain 25/8/31 chronological buckets, including zero-activity intervals. `from` is inclusive and `until` exclusive. The final bucket may be partial. At most ten named groups are returned; other models are aggregated in optional `remainder` objects with the same metric fields. Totals already include remainder. Groups without requests are omitted from individual buckets. Costs and tokens can be absent for legacy-plan usage; these values are unknown, not zero. Cached input is a subset of input tokens. New usage can take time to appear.

## GET /v1.0/api/balance

Authenticated current balance proxy to `https://ollama.com/api/balance`. No parameters. Statuses: 200, common proxy errors. No historical balance, per-model balance or scope parameter is available. The 200 JSON passes through unchanged:

```json
{
  "included":{"balance_usd":72.5,"allowance_usd":100,"period":{"from":"2026-11-01T00:00:00Z","until":"2026-12-01T00:00:00Z"}},
  "purchased":{"balance_usd":25}
}
```

Available USD is included remaining plus purchased remaining. All team members share this balance. Purchased credit excludes expired credits. Legacy plans instead have `included.session` and `included.weekly`, each containing `remaining_percent` (0-100) and `resets_at` (UTC timestamp). The monitor displays those limits and leaves aggregate USD unavailable because the included USD value is unknown.

## Sources

[Ollama Cloud usage](https://docs.ollama.com/api/cloud-usage) and [Balance](https://docs.ollama.com/api/balance), checked 2026-11-02. The local simulation reproduces these response structures with synthetic usage. Authenticated live behavior remains to be checked using the owner's key.
