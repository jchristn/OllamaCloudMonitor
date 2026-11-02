namespace OllamaCloudMonitor.Server
{
    using System;
    using System.Collections.Specialized;
    using System.Diagnostics;
    using System.Diagnostics.Metrics;
    using System.Linq;
    using System.Net.Http;
    using System.Threading;
    using System.Threading.Tasks;
    using WatsonWebserver;
    using WatsonWebserver.Core;

    /// <summary>Allowlisted read-only routes forwarding the caller's bearer token to Ollama.</summary>
    public sealed class UsageRoutes : IDisposable
    {
        private readonly HttpClient _Client;
        private readonly Meter _Meter = new Meter("OllamaCloudMonitor", "0.1.0");
        private readonly ActivitySource _Activities = new ActivitySource("OllamaCloudMonitor");
        private readonly Counter<long> _Requests;
        private readonly Histogram<double> _Duration;

        /// <summary>Creates upstream routes. The owner retains ownership of the client.</summary>
        public UsageRoutes(HttpClient client)
        {
            ArgumentNullException.ThrowIfNull(client);
            _Client = client;
            _Requests = _Meter.CreateCounter<long>("ollama.upstream.requests");
            _Duration = _Meter.CreateHistogram<double>("ollama.upstream.duration", "s");
        }

        /// <summary>Registers usage and balance operations in Watson.</summary>
        public void Register(Webserver server)
        {
            ArgumentNullException.ThrowIfNull(server);
            server.Routes.PreAuthentication.Static.Add(WatsonWebserver.Core.HttpMethod.GET, "/v1.0/api/usage", ctx => ForwardAsync(ctx, "usage", ctx.Token));
            server.Routes.PreAuthentication.Static.Add(WatsonWebserver.Core.HttpMethod.GET, "/v1.0/api/balance", ctx => ForwardAsync(ctx, "balance", ctx.Token));
        }

        /// <summary>Disposes instrumentation. Does not dispose the caller's HTTP client.</summary>
        public void Dispose() { _Meter.Dispose(); _Activities.Dispose(); }

        private async Task ForwardAsync(HttpContextBase ctx, string resource, CancellationToken cancellationToken)
        {
            MonitorServer.SecureHeaders(ctx);
            ctx.Response.ContentType = "application/json";
            string? authorization = ctx.Request.Headers["Authorization"];
            if (authorization == null || !authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) || string.IsNullOrWhiteSpace(authorization[7..]) || authorization.Length > 4096)
            {
                await ErrorAsync(ctx, 401, "unauthorized").ConfigureAwait(false);
                return;
            }
            NameValueCollection query = System.Web.HttpUtility.ParseQueryString(new Uri("http://127.0.0.1" + ctx.Request.Url.RawWithQuery).Query);
            string[] allowed = resource == "usage" ? new[] { "range", "scope", "group_by" } : Array.Empty<string>();
            if (query.AllKeys.Any(key => key == null || !allowed.Contains(key) || query.GetValues(key)?.Length != 1)
                || (query["range"] != null && !new[] { "24h", "7d", "30d" }.Contains(query["range"]))
                || (query["scope"] != null && !new[] { "self", "team" }.Contains(query["scope"]))
                || (query["group_by"] != null && query["group_by"] != "model"))
            {
                await ErrorAsync(ctx, 400, "invalid_query").ConfigureAwait(false);
                return;
            }
            string suffix = resource == "usage" ? "?range=" + (query["range"] ?? "7d") + "&scope=" + (query["scope"] ?? "self") + "&group_by=model" : "";
            Stopwatch timer = Stopwatch.StartNew();
            using Activity? activity = _Activities.StartActivity("ollama." + resource, ActivityKind.Client);
            try
            {
                using HttpRequestMessage request = new HttpRequestMessage(System.Net.Http.HttpMethod.Get, "api/" + resource + suffix);
                request.Headers.TryAddWithoutValidation("Authorization", authorization);
                using HttpResponseMessage response = await _Client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken).ConfigureAwait(false);
                ctx.Response.StatusCode = (int)response.StatusCode;
                if (response.Headers.RetryAfter != null) ctx.Response.Headers.Set("Retry-After", response.Headers.RetryAfter.ToString());
                if ((int)response.StatusCode is >= 300 and < 400)
                {
                    await ErrorAsync(ctx, 502, "upstream_redirect").ConfigureAwait(false);
                }
                else if (!response.IsSuccessStatusCode)
                {
                    await ErrorAsync(ctx, (int)response.StatusCode, "upstream_" + (int)response.StatusCode).ConfigureAwait(false);
                }
                else if (response.Content.Headers.ContentType?.MediaType != "application/json")
                {
                    await ErrorAsync(ctx, 502, "upstream_invalid_response").ConfigureAwait(false);
                }
                else
                {
                    using CancellationTokenSource bodyTimeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                    bodyTimeout.CancelAfter(_Client.Timeout);
                    string body = await response.Content.ReadAsStringAsync(bodyTimeout.Token).ConfigureAwait(false);
                    await ctx.Response.Send(body).ConfigureAwait(false);
                }
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            { await ErrorAsync(ctx, 504, "upstream_timeout").ConfigureAwait(false); }
            catch (HttpRequestException)
            { await ErrorAsync(ctx, 502, "upstream_unavailable").ConfigureAwait(false); }
            finally
            {
                TagList tags = new TagList { { "resource", resource }, { "status", ctx.Response.StatusCode } };
                _Requests.Add(1, tags);
                _Duration.Record(timer.Elapsed.TotalSeconds, tags);
                activity?.SetTag("http.response.status_code", ctx.Response.StatusCode);
                if (ctx.Response.StatusCode >= 400) activity?.SetStatus(ActivityStatusCode.Error);
            }
        }

        private static async Task ErrorAsync(HttpContextBase ctx, int status, string code)
        {
            ctx.Response.StatusCode = status;
            await ctx.Response.Send("{\"error\":\"" + code + "\"}").ConfigureAwait(false);
        }
    }
}
