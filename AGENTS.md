# Project instructions

Follow CONTRIBUTING.md and docs/IMPLEMENTATION.md. Shared architecture requirements are in ~/Code/Agents/requirements when available. The upstream contract is https://docs.ollama.com/api/cloud-usage and https://docs.ollama.com/api/balance.

Before non-trivial API work, use the installed postman:api-engineer skill. Keep postman/specs/monitor.openapi.json, postman/collections/monitor, and REST_API.md synchronized. Run node test/run.mjs for the full local suite. Do not store real API keys in fixtures, arguments, logs, browser storage, or repository files. Preserve absence of legacy cost fields. Never infer historical or per-model balances.

Use one C# class per file, namespace-first declarations, namespace-scoped alphabetized imports, explicit variable types, nullable checks, CancellationToken parameters, ConfigureAwait(false), documented public APIs, and meaningful errors. Do not use em dashes. The release number is explicitly v0.1.0; do not change it without a request.
