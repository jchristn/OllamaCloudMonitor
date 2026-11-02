# Security

Report a suspected vulnerability privately to the repository owner through GitHub's security reporting feature when enabled. Do not post API keys in issues or pull requests.

The browser sends the token to the same-origin monitor server. That server forwards it only to its configured Ollama upstream. Tokens are held in memory, are not logged, and are cleared on sign-out or page exit. The monitor never stores billing responses on disk. Browser-local preferences contain only theme, language, and automatic refresh settings. CSV downloads contain usage data.

Use HTTPS when exposing this application outside your machine. Keep OLLAMA_BASE_URL at https://ollama.com in production. Restrict deployment configuration to trusted administrators. No upstream redirects are followed. No cross-origin access is enabled. All API responses use Cache-Control: no-store. There is no application-wide token or account cache, no server-managed account session, and no local privilege system. Ollama validates each forwarded key and enforces team privileges. Monitor health is liveness only and does not imply Ollama is reachable.

Host the dashboard and proxy together. The optional Vite development proxy is for local development. Avoid third-party scripts and do not add tokens to URLs, .env files, telemetry, test fixtures, screenshots, or persistent browser storage.
