# v0.1.0 validation

Verified locally on 2026-11-02, macOS ARM64, Node 24.21.0, .NET SDK 10.0.401, and Postman CLI 1.75.0.

| Check | Result |
| --- | --- |
| Production dashboard build | Passed |
| Managed Watson HTTP integration suite | 27 checks passed |
| Native AOT shared HTTP integration suite | 27 checks passed |
| Frontend accounting, request-building and locale unit tests | 14 tests passed |
| Browser integration and responsive tests | 51 tests passed |
| Postman collection | 4 requests, 12 assertions, 0 failures |
| OpenAPI syntax and collection lint | Passed, 0 issues |
| i18n structural checks | 142 keys across 14 locales; key parity, usage, interpolation and encoding passed |
| Dependency audit | 0 known vulnerabilities reported by npm audit |
| Docker image | Built successfully with official .NET Alpine runtime |
| Docker smoke test | Non-root, read-only container returned 200 for health and reached healthy state |
| Compose validation | Passed |

The final full suite was run with `node test/run.mjs`. Browser coverage includes demo and simulated-provider sign-in, all routes, three timeframe/model controls, JSON inspection, CSV export, logout, legacy unavailable values, invalid credentials, Retry-After, locale persistence, and screen widths 1440, 820 and 390 in both themes. Desktop login, desktop overview, mobile dark overview, and expanded/RTL layouts were inspected through generated screenshots. The chart now adapts its SVG coordinate system to its container so mobile axes remain readable. Shared metric tests ensure cached input is not added twice, remainder is retained in totals, and absent legacy USD is not treated as zero.

All upstream integration tests use the committed Postman mock derived from Ollama's published contract. The simulation log showed requests reaching /api/usage and /api/balance through the actual Watson server. The fake keys select deterministic local scenarios. No authenticated live Ollama request was made because no real key was supplied. Live account correctness and provider-side quota behavior remain unverified. The 20-second upstream timeout is configured but a hanging upstream has not been exercised. Native-speaker translation review is still appropriate before wider distribution.

GitHub Actions is configured for the full suite on Linux, Windows and macOS, but only local macOS execution and Linux ARM64 Docker liveness have been verified in this session. Repository branch protection must be enabled on GitHub after the initial push. No remote push, release tag, Docker Hub publication, or deployment was performed.

The installed Postman CLI does not implement `postman status`. Syntax lint and collection lint/run succeeded; authenticated governance lint and owner's mock discovery were unavailable without Postman sign-in. Orbit search did not return the needed usage/balance endpoints, so the official Ollama documentation was authoritative. The CLI status/manifest documentation mismatch was reported using the Postman API engineering skill's feedback workflow. It did not block local simulation or collection execution.

## Configured-account Docker follow-up

The full local suite passed again after adding OLLAMA_CLOUD_BEARER_TOKEN support. New HTTP checks cover missing-header fallback to a prefixed configured token, usage and balance access, credential-free health metadata, explicit token precedence, and rejection of malformed/invalid explicit keys. Two additional browser tests verify configured-account login without an Authorization header and rejection of an explicitly invalid browser token.

The relocated docker/server/Dockerfile builds successfully. A Compose deployment supplied the synthetic token only at runtime and used the existing local Postman simulation as its upstream. Container-level health, anonymous configured-account balance access, and explicit invalid-token rejection were checked through real HTTP. No real Ollama key or billing account was used. The Windows batch helpers were reviewed but were not executed on macOS.

## Request History removal

Removed the Request History route, navigation entry, client-side request recording and unused translations at the user's request. Updated route coverage verifies the navigation entry is absent. The full suite passed with 7 unit tests, 18 browser tests, 27 managed and 27 Native AOT HTTP checks, 12 Postman assertions, and 140 translation keys across six locales. The main test server used MONITOR_TEST_PORT=18080 because port 8080 was already occupied; the existing service was left running. Updated dashboard preview assets reflect the current navigation.

## API explorer query controls and alignment

The explorer now reads each supported GET operation's query parameters from OpenAPI, seeds defaults from the dashboard selection, and keeps its edited values independent. Empty optional values are omitted and query parameters are filtered by the selected endpoint. The request preview uses URLSearchParams, matching the shared API client's encoded request. When the server contract cannot load, the same checked-in contract is bundled as a fallback, including its query definitions.

The full local suite passed on port 18080: 10 unit tests, 26 browser tests, 27 managed HTTP checks, 27 Native AOT HTTP checks and 12 Postman assertions. New browser coverage observed a real HTTP usage request with range=30d, scope=team and group_by=model, its matching response, a balance request with no query string, parameter retention across endpoint changes, and query controls under the fallback contract. Browser geometry assertions confirmed matching selector/button heights and top alignment within 0.5px at 1440, 820 and 390 pixels in both themes. Generated desktop and mobile explorer screenshots were visually reviewed. The Docker image builds with the canonical fallback contract included in its build stage. Authenticated live Ollama behavior remains unverified; requests used the existing local simulation.

## Twelve-language baseline

Added Brazilian Portuguese, French, Italian, German, Simplified Chinese, Russian, Malay and Hindi. Each of the twelve real languages and two pseudo-locales contains all 146 message keys, with matching interpolation placeholders and UTF-8 validation. The central registry now records canonical BCP 47 codes, autonyms, English names, direction, fallback and script notes. Tests cover regional aliases, including pt-PT to pt-BR and zh-CN to zh-Hans, stored-preference precedence and fallback from an unsupported stored value to a supported browser language.

Catalogs are split by language and loaded through dynamic imports. A browser test delayed the Hindi catalog and verified that the application remained unrendered until its selected language was ready. Switching to German fetched the German catalog without loading unrelated languages. All 51 browser tests passed, including every real language through mobile model/explorer/settings routes and logout, and persistence/reload checks for every non-English language and both pseudo-locales. Equal explorer control heights, response-placeholder wrapping and page overflow are checked on the localized mobile routes. German, Hindi and Simplified Chinese screenshots were inspected, including Devanagari rendering and Chinese number/date formatting. A localized heading assertion was scoped to level 1 after finding that Settings and Preferences legitimately share text in several languages.

The full suite passed with 14 unit tests, 27 managed HTTP checks, 27 Native AOT checks and 12 Postman assertions, in addition to the browser and catalog checks. The Docker image builds with the split catalogs. Remote CI and native-speaker editorial review remain separate from this local validation. No real Ollama credential was used.
