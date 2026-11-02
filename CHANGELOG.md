# Changelog

## Unreleased

- Organized Docker assets under docker/, with a server Dockerfile, environment template, deployment guide, update helper and confirmed factory reset.
- Added optional OLLAMA_CLOUD_BEARER_TOKEN runtime configuration with a configured-account login action, explicit-token precedence and credential-free health metadata.
- Added managed, Native AOT and browser coverage for configured-account access and explicit-key rejection.

## v0.1.0 - 2026-11-02

Initial alpha release. Version v0.1.0 follows the explicitly requested release number.

- Added bearer-token login with memory-only credential handling and a synthetic demo workspace.
- Added 24-hour, 7-day, and 30-day usage plots with UTC boundaries, partial buckets, scope selection, and model filtering.
- Added current included and purchased credit totals, allowance progress, reset times, and legacy percentage limits.
- Added model comparison, CSV export, session request history, API explorer, and browser settings.
- Added light/dark themes, responsive layouts, English, Spanish, Japanese, Arabic, and pseudo-locales.
- Added a Watson 7 read-only proxy, OpenAPI, Postman collection and simulation, telemetry, Docker packaging, CI, and shared managed/Native AOT tests.
