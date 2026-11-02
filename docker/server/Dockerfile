FROM node:24-alpine AS dashboard
WORKDIR /build/dashboard
COPY dashboard/package*.json ./
RUN npm ci
COPY dashboard/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS server
WORKDIR /build
COPY src/ src/
RUN dotnet publish src/OllamaCloudMonitor.Server -c Release -o /out --no-self-contained

FROM mcr.microsoft.com/dotnet/runtime:10.0-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY --from=server /out/ ./
COPY --from=dashboard /build/dashboard/dist/ dashboard/dist/
COPY postman/specs/monitor.openapi.json postman/specs/monitor.openapi.json
ENV MONITOR_HOST=0.0.0.0 MONITOR_PORT=8080
EXPOSE 8080
USER $APP_UID
HEALTHCHECK --interval=5s --timeout=3s --retries=2 CMD curl -f http://127.0.0.1:8080/v1.0/api/health || exit 1
ENTRYPOINT ["dotnet", "OllamaCloudMonitor.Server.dll"]
