# Security

Report a suspected vulnerability privately to the repository owner through GitHub's security reporting feature when enabled. Do not post API keys in issues or pull requests.

By default, the browser sends its entered token to the same-origin monitor server. That server forwards it only to its configured Ollama upstream. Browser-entered tokens are held in memory, are not logged, and are cleared on sign-out or page exit. The monitor never stores billing responses on disk. Browser-local preferences contain only theme, language, and automatic refresh settings. CSV downloads contain usage data.

Use HTTPS when exposing this application outside your machine. Keep OLLAMA_BASE_URL at https://ollama.com in production. Restrict deployment configuration to trusted administrators. No upstream redirects are followed. No cross-origin access is enabled. All API responses use Cache-Control: no-store. There is no application-wide account-response cache, no server-managed account session, and no local privilege system. Ollama validates each forwarded key and enforces team privileges. Monitor health is liveness only and does not imply Ollama is reachable.

Host the dashboard and proxy together. The optional Vite development proxy is for local development. Avoid third-party scripts and do not add tokens to URLs, tracked configuration files, telemetry, test fixtures, screenshots, or persistent browser storage.

## Optional configured account

Setting `OLLAMA_CLOUD_BEARER_TOKEN` enables shared access: a request without Authorization uses the deployment's token. Anyone who can access the service can then view that account's usage and balance. Explicit Authorization takes precedence, including rejection of invalid or malformed explicit credentials; they never fall back to the configured account. The health endpoint exposes only `configured_account: true/false`, never the key. The key is read once at startup and is not cleared by a browser sign-out.

Keep the default loopback port binding or put authentication and HTTPS at a trusted reverse proxy before sharing this mode. A local ignored `docker/.env` can supply the environment variable, but it is a plaintext secret on the host. Protect its permissions and keep it out of source control, backups and shared configuration output. Docker administrators can inspect container environments. Rotate the key by updating the environment and recreating the container. Build contexts exclude all `.env` files; tokens must never be supplied as Docker build arguments or Vite client variables.
