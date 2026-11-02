@echo off
cd /d "%~dp0"
set "MONITOR_ENV_OPTION="
if exist .env set "MONITOR_ENV_OPTION=--env-file .env"
docker compose %MONITOR_ENV_OPTION% -f compose.yaml build --pull
if errorlevel 1 exit /b %errorlevel%
docker compose %MONITOR_ENV_OPTION% -f compose.yaml up -d
if errorlevel 1 exit /b %errorlevel%
docker ps -a
