@echo off
cd /d "%~dp0.."
echo This stops the stack and removes its named volumes and orphan containers.
echo The current monitor stack has no persistent volumes. The .env file is preserved.
choice /M "Reset the local Docker stack"
if errorlevel 2 exit /b 0
if exist .env (
  docker compose --env-file .env -f compose.yaml down --volumes --remove-orphans
) else (
  docker compose -f compose.yaml down --volumes --remove-orphans
)
