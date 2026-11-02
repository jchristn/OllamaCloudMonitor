# Implementation scope and route inventory

Ollama Cloud Monitor is a read-only credential-forwarding dashboard. Ollama owns identity, team permissions, credits, and inference records. No local identity database, user management, or writable billing resources are introduced. Account balances are never attributed to individual models. No balance history is inferred from spending.

References inspected: Tempo's dashboard shell and theme tokens for operator navigation; Watson's authentication example, hosting reference, and telemetry documentation for the server. Shared requirements are in ~/Code/Agents/requirements.

| Route | Job | Role | Resources and filters | Actions | Empty/error state |
| --- | --- | --- | --- | --- | --- |
| / | Connect token | Key holder | Usage validation | Connect, demo, language, theme | Invalid/expired key, retry |
| /dashboard/home | Track usage and current credit | Key holder or team admin | Usage: 24h/7d/30d, self/team; local model filter | Refresh, export CSV, inspect bucket | No usage, unavailable cost, API failure |
| /dashboard/models | Compare models | Same | Up to ten model groups plus remainder | Search, sort, pagination, JSON details | No groups, legacy costs unavailable |
| /dashboard/api-explorer | Inspect live responses | Same | OpenAPI allowlisted GET operations and schema-derived query controls | Edit per-operation query values, preview encoded request, execute, inspect response | Failure and retry deadline |
| /dashboard/settings | Preferences and server info | Same | Browser theme, locale, auto refresh; server endpoint/version | Apply browser preferences | Server settings are deployment environment configuration |

No CRUD, local roles, tenant database, server restart, or mutable settings API is appropriate for this read-only proxy. Ollama enforces scope=team privileges. Request History is omitted because Ollama does not expose individual inference request history. No global account data cache exists. Optional OLLAMA_CLOUD_BEARER_TOKEN provides a server-owned shared account for requests with no Authorization header, exposed to the login page only as a health boolean. Explicit bearer headers override it and never fall back on failure. The server uses Watson 7 and emits built-in Watson telemetry plus upstream operation metrics/traces. Exporter infrastructure is deployment-owned rather than bundled.

Initial version is v0.1.0 as explicitly requested (alpha quality). All twelve baseline languages ship: English, Spanish, Brazilian Portuguese, French, Italian, German, Simplified Chinese, Arabic, Russian, Malay, Hindi and Japanese. Expansion and RTL pseudo-locales remain available. Catalogs load on demand through the central locale registry. AOT verification is included separately from browser tests.
