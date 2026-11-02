<p align="center"><img src="https://raw.githubusercontent.com/jchristn/OllamaCloudMonitor/main/dashboard/public/assets/ollama.png" alt="Ollama" width="44" /></p>

# Ollama Cloud Monitor

A read-only dashboard for Ollama Cloud usage and current credit balances. Select 24 hours, 7 days, or 30 days, filter usage by model, export CSV, and inspect current included and purchased credits. A synthetic demo needs no key.

Use it to understand model costs, spot usage changes, and monitor remaining account credits. Balances are shared across models and team members; historical and per-model balances are not provided by Ollama. Legacy missing USD metrics remain unavailable.

## Getting started

Build from [the source repository](https://github.com/jchristn/OllamaCloudMonitor):

```sh
git clone https://github.com/jchristn/OllamaCloudMonitor.git
cd OllamaCloudMonitor
docker compose -f docker/compose.yaml up --build -d
```

Open http://127.0.0.1:8080 and paste an Ollama API key or choose the demo. No key is configured in Docker. Tokens remain in browser/server memory for requests and are never saved to disk. Sign out to clear the session.

React serves the interactive UI; a Watson 7 / .NET 10 server hosts static files and forwards only the allowlisted read-only API requests to Ollama. The image includes cURL, runs without root, and probes `/v1.0/api/health` every five seconds. That probe verifies monitor liveness, not upstream access. No persistent volume is required.

The container binds port 8080. Optional `MONITOR_PORT`, `MONITOR_HOST`, `MONITOR_WEB_ROOT` and `MONITOR_SPEC_PATH` configure startup. Keep `OLLAMA_BASE_URL` at its default `https://ollama.com` in production. Use HTTPS at a trusted reverse proxy for remote access. No Docker Hub image publication is assumed; after publishing one, replace the Compose image reference with the chosen registry tag.

[Usage instructions and configuration](https://github.com/jchristn/OllamaCloudMonitor#readme) · [API documentation](https://github.com/jchristn/OllamaCloudMonitor/blob/main/REST_API.md) · [MIT license](https://github.com/jchristn/OllamaCloudMonitor/blob/main/LICENSE.md)

The Ollama name and logo belong to their owners. This independent project is not affiliated with Ollama.
