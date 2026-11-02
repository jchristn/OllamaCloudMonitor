@echo off
cd /d "%~dp0"
docker compose -f compose.yaml pull
docker compose -f compose.yaml down
docker compose -f compose.yaml up -d
docker ps -a
