# Docker deployment

Run from the repository root:

```sh
cp docker/.env.example docker/.env
```

Edit `docker/.env` locally and set `OLLAMA_CLOUD_BEARER_TOKEN` to your Ollama key (raw token or `Bearer <token>`). Leave it blank for per-browser key login. Optionally change `MONITOR_PUBLISHED_PORT` from 8080. The environment file is ignored by Git and excluded from Docker builds. Do not put a real token in the example file.

```sh
docker compose --env-file docker/.env -f docker/compose.yaml up --build -d
```

Open http://127.0.0.1:8080 and select **Open configured account**. The browser receives only a boolean indicating that an account is configured, never the server's key. A manually entered bearer token overrides the configured key for that browser session. An invalid explicit key is rejected; it does not fall back to the server account.

Setting the variable enables shared account access for anyone who can reach the monitor's usage and balance endpoints. The default host binding is loopback. Put authentication and HTTPS at your reverse proxy before sharing this deployment. Signing out clears browser state; it does not remove the deployment's environment variable. Token rotation requires updating the environment and recreating the container with the command above. Docker administrators can inspect container environment variables.

Alternatively, export `OLLAMA_CLOUD_BEARER_TOKEN` in your shell and run Compose without `--env-file`. Compose injects it at container runtime. The secret is never a build argument, image ENV value, client build variable or static asset. Avoid sharing expanded `docker compose config` output because it includes resolved environment values.

Assets:

- `compose.yaml`: local image/build, loopback port, runtime environment, read-only filesystem, dropped capabilities and restart policy.
- `server/Dockerfile`: multi-stage dashboard/server build, non-root runtime with cURL.
- `.env.example`: empty token template.
- `update.sh` (macOS/Linux) and `update.bat` (Windows): build the application locally with refreshed base images (`build --pull`), recreate changed containers (`up -d`), and list containers. Both load local `.env` when present, stop on failure, and preserve named volumes.
- `factory/reset.bat`: confirmed teardown including named volumes and orphan containers; preserves `.env`. This monitor currently has no persistent volumes.

Health is checked with `curl -f http://127.0.0.1:8080/v1.0/api/health`, every five seconds, timeout three seconds, two retries. It reports monitor liveness, not Ollama connectivity. There are no backing services requiring `depends_on`.

For source updates, pull Git changes and run the update helper. It does not pull a published application image or tear down the stack before building. If the build fails, the existing container remains running.

From the repository root, run `./docker/update.sh`. The helper resolves Compose and `.env` paths relative to itself, so it also works when invoked by its path from another directory. It stops on a failed command before proceeding to the next step.
