@echo off
cd /d "%~dp0"
set "MONITOR_ENV_OPTION="
if exist .env set "MONITOR_ENV_OPTION=--env-file .env"
docker compose %MONITOR_ENV_OPTION% -f compose.yaml pull
docker compose %MONITOR_ENV_OPTION% -f compose.yaml down
docker compose %MONITOR_ENV_OPTION% -f compose.yaml up -d
docker ps -a
