namespace OllamaCloudMonitor.Testing
{
    using System;
    using System.Net;
    using System.Net.Http;
    using System.Threading;
    using System.Threading.Tasks;
    using OllamaCloudMonitor.Server;

    /// <summary>Shared HTTP integration suite run unchanged by managed and Native AOT runners.</summary>
    public static class MonitorSuite
    {
        /// <summary>Runs against a real Watson listener. OLLAMA_BASE_URL must point to the local Postman simulation.</summary>
        public static async Task<int> RunAsync(CancellationToken cancellationToken)
        {
            if (!(Environment.GetEnvironmentVariable("OLLAMA_BASE_URL") ?? "").StartsWith("http://127.0.0.1:", StringComparison.Ordinal))
                throw new InvalidOperationException("Tests require OLLAMA_BASE_URL pointing to the local Postman simulation.");
            Environment.SetEnvironmentVariable("OLLAMA_CLOUD_BEARER_TOKEN", null);
            Environment.SetEnvironmentVariable("MONITOR_PORT", "8081");
            using MonitorServer server = new MonitorServer();
            server.Start();
            using HttpClient client = new HttpClient { BaseAddress = new Uri("http://127.0.0.1:8081"), Timeout = TimeSpan.FromSeconds(30) };
            int passed = 0;
            await AssertAsync(client, "/v1.0/api/health", null, HttpStatusCode.OK, "\"status\":\"ok\"", cancellationToken).ConfigureAwait(false); passed++;
            await AssertAsync(client, "/openapi.json", null, HttpStatusCode.OK, "openapi", cancellationToken).ConfigureAwait(false); passed++;
            await AssertAsync(client, "/", null, HttpStatusCode.OK, "<html", cancellationToken).ConfigureAwait(false); passed++;
            await AssertAsync(client, "/dashboard/models", null, HttpStatusCode.OK, "<html", cancellationToken).ConfigureAwait(false); passed++;
            await AssertAsync(client, "/v1.0/api/usage", null, HttpStatusCode.Unauthorized, "unauthorized", cancellationToken).ConfigureAwait(false); passed++;
            await AssertAsync(client, "/v1.0/api/usage?range=1d", "test", HttpStatusCode.BadRequest, "invalid_query", cancellationToken).ConfigureAwait(false); passed++;
            await AssertAsync(client, "/v1.0/api/usage?range=7d&range=24h", "test", HttpStatusCode.BadRequest, "invalid_query", cancellationToken).ConfigureAwait(false); passed++;
            await AssertAsync(client, "/v1.0/api/usage?scope=admin", "test", HttpStatusCode.BadRequest, "invalid_query", cancellationToken).ConfigureAwait(false); passed++;
            await AssertAsync(client, "/v1.0/api/balance?scope=team", "test", HttpStatusCode.BadRequest, "invalid_query", cancellationToken).ConfigureAwait(false); passed++;
            foreach (string range in new[] { "24h", "7d", "30d" })
            {
                await AssertAsync(client, "/v1.0/api/usage?range=" + range + "&group_by=model&scope=self", "test", HttpStatusCode.OK, "\"range\":\"" + range + "\"", cancellationToken).ConfigureAwait(false); passed++;
            }
            await AssertAsync(client, "/v1.0/api/balance", "test", HttpStatusCode.OK, "balance_usd", cancellationToken).ConfigureAwait(false); passed++;
            await AssertAsync(client, "/v1.0/api/usage", "invalid", HttpStatusCode.Unauthorized, "upstream_401", cancellationToken).ConfigureAwait(false); passed++;
            await AssertAsync(client, "/v1.0/api/usage?scope=team", "forbidden", HttpStatusCode.Forbidden, "upstream_403", cancellationToken).ConfigureAwait(false); passed++;
            await AssertAsync(client, "/v1.0/api/usage", "limited", HttpStatusCode.TooManyRequests, "upstream_429", cancellationToken).ConfigureAwait(false); passed++;
            await AssertAsync(client, "/v1.0/api/usage", "broken", HttpStatusCode.InternalServerError, "upstream_500", cancellationToken).ConfigureAwait(false); passed++;
            await AssertAsync(client, "/v1.0/api/usage", "redirect", HttpStatusCode.BadGateway, "upstream_redirect", cancellationToken).ConfigureAwait(false); passed++;
            await AssertAsync(client, "/v1.0/api/balance", "legacy", HttpStatusCode.OK, "remaining_percent", cancellationToken).ConfigureAwait(false); passed++;
            await AssertAsync(client, "/v1.0/api/unknown", "test", HttpStatusCode.NotFound, "", cancellationToken).ConfigureAwait(false); passed++;
            await AssertAsync(client, "/v1.0/api/health", null, HttpStatusCode.OK, "\"configured_account\":false", cancellationToken).ConfigureAwait(false); passed++;
            Environment.SetEnvironmentVariable("MONITOR_PORT", "8083");
            Environment.SetEnvironmentVariable("OLLAMA_CLOUD_BEARER_TOKEN", "Bearer test");
            try
            {
                using MonitorServer configuredServer = new MonitorServer();
                configuredServer.Start();
                using HttpClient configuredClient = new HttpClient { BaseAddress = new Uri("http://127.0.0.1:8083"), Timeout = TimeSpan.FromSeconds(30) };
                await AssertAsync(configuredClient, "/v1.0/api/health", null, HttpStatusCode.OK, "\"configured_account\":true", cancellationToken).ConfigureAwait(false); passed++;
                await AssertAsync(configuredClient, "/v1.0/api/usage?range=24h", null, HttpStatusCode.OK, "\"range\":\"24h\"", cancellationToken).ConfigureAwait(false); passed++;
                await AssertAsync(configuredClient, "/v1.0/api/balance", null, HttpStatusCode.OK, "balance_usd", cancellationToken).ConfigureAwait(false); passed++;
                await AssertAsync(configuredClient, "/v1.0/api/usage", "invalid", HttpStatusCode.Unauthorized, "upstream_401", cancellationToken).ConfigureAwait(false); passed++;
                await AssertAsync(configuredClient, "/v1.0/api/balance", "legacy", HttpStatusCode.OK, "remaining_percent", cancellationToken).ConfigureAwait(false); passed++;
                await AssertAsync(configuredClient, "/v1.0/api/usage", "", HttpStatusCode.Unauthorized, "unauthorized", cancellationToken).ConfigureAwait(false); passed++;
            }
            finally
            {
                Environment.SetEnvironmentVariable("OLLAMA_CLOUD_BEARER_TOKEN", null);
                Environment.SetEnvironmentVariable("MONITOR_PORT", "8081");
            }
            return passed;
        }

        private static async Task AssertAsync(HttpClient client, string path, string? token, HttpStatusCode status, string contains, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            using HttpRequestMessage request = new HttpRequestMessage(System.Net.Http.HttpMethod.Get, path);
            if (token != null) request.Headers.TryAddWithoutValidation("Authorization", "Bearer " + token);
            using HttpResponseMessage response = await client.SendAsync(request, cancellationToken).ConfigureAwait(false);
            string body = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            if (response.StatusCode != status || !body.Contains(contains, StringComparison.Ordinal))
                throw new InvalidOperationException("Failed " + path + ": expected " + status + ", got " + response.StatusCode + ". Body: " + body);
            if (!response.Headers.CacheControl?.NoStore ?? true)
                throw new InvalidOperationException("Missing no-store on " + path);
            if (response.Headers.Contains("Access-Control-Allow-Origin"))
                throw new InvalidOperationException("Unexpected cross-origin access on " + path);
            if (status == HttpStatusCode.TooManyRequests && response.Headers.RetryAfter?.Delta?.TotalSeconds != 8)
                throw new InvalidOperationException("Retry-After was not preserved.");
        }
    }
}
