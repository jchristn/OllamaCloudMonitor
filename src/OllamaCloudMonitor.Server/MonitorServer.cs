namespace OllamaCloudMonitor.Server
{
    using System;
    using System.IO;
    using System.Net.Http;
    using System.Threading;
    using System.Threading.Tasks;
    using WatsonWebserver;
    using WatsonWebserver.Core;

    /// <summary>Owns the Watson listener and stateless Ollama integration.</summary>
    public sealed class MonitorServer : IDisposable
    {
        private readonly Webserver _Server;
        private readonly HttpClient _Client;
        private readonly UsageRoutes _Usage;
        private readonly string _WebRoot;
        private readonly string _SpecPath;

        /// <summary>Creates a listener configured by MONITOR_HOST, MONITOR_PORT, MONITOR_WEB_ROOT and OLLAMA_BASE_URL.</summary>
        public MonitorServer()
        {
            string hostname = Environment.GetEnvironmentVariable("MONITOR_HOST") ?? "127.0.0.1";
            int port = int.Parse(Environment.GetEnvironmentVariable("MONITOR_PORT") ?? "8080", System.Globalization.CultureInfo.InvariantCulture);
            _WebRoot = Path.GetFullPath(Environment.GetEnvironmentVariable("MONITOR_WEB_ROOT") ?? "dashboard/dist");
            _SpecPath = Path.GetFullPath(Environment.GetEnvironmentVariable("MONITOR_SPEC_PATH") ?? "postman/specs/monitor.openapi.json");
            _Client = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false })
            {
                BaseAddress = new Uri((Environment.GetEnvironmentVariable("OLLAMA_BASE_URL") ?? "https://ollama.com").TrimEnd('/') + "/"),
                Timeout = TimeSpan.FromSeconds(20)
            };
            WebserverSettings settings = new WebserverSettings(hostname, port, false);
            settings.Headers.DefaultHeaders.Clear();
            _Server = new Webserver(settings, StaticAsync);
            _Usage = new UsageRoutes(_Client);
            _Usage.Register(_Server);
            _Server.Routes.PreAuthentication.Static.Add(WatsonWebserver.Core.HttpMethod.GET, "/v1.0/api/health", HealthAsync);
            _Server.Routes.PreAuthentication.Static.Add(WatsonWebserver.Core.HttpMethod.GET, "/openapi.json", SpecAsync);
            _Server.Routes.Preflight = async ctx =>
            {
                ctx.Response.StatusCode = 405;
                await ctx.Response.Send().ConfigureAwait(false);
            };
            _Server.Routes.PostRouting = ctx => Task.CompletedTask;
        }

        /// <summary>Starts listening. The caller owns disposal.</summary>
        public void Start() => _Server.Start();

        /// <summary>Stops the listener and disposes outbound HTTP connections.</summary>
        public void Dispose()
        {
            _Server.Dispose();
            _Client.Dispose();
            _Usage.Dispose();
        }

        private static async Task HealthAsync(HttpContextBase ctx)
        {
            SecureHeaders(ctx);
            ctx.Response.StatusCode = 200;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.Send("{\"status\":\"ok\",\"version\":\"0.1.0\",\"upstream\":\"https://ollama.com\"}").ConfigureAwait(false);
        }

        private async Task SpecAsync(HttpContextBase ctx)
        {
            SecureHeaders(ctx);
            ctx.Response.StatusCode = File.Exists(_SpecPath) ? 200 : 503;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.Send(File.Exists(_SpecPath) ? await File.ReadAllTextAsync(_SpecPath, ctx.Token).ConfigureAwait(false) : "{\"error\":\"contract_unavailable\"}").ConfigureAwait(false);
        }

        private async Task StaticAsync(HttpContextBase ctx)
        {
            SecureHeaders(ctx);
            string path = Uri.UnescapeDataString(ctx.Request.Url.RawWithoutQuery);
            if (ctx.Request.Method != WatsonWebserver.Core.HttpMethod.GET || path.StartsWith("/v1.0/") || path.IndexOf('\0') >= 0)
            {
                ctx.Response.StatusCode = 404;
                await ctx.Response.Send().ConfigureAwait(false);
                return;
            }
            string fullPath = Path.GetFullPath(Path.Combine(_WebRoot, path == "/" ? "index.html" : path.TrimStart('/')));
            if (!fullPath.StartsWith(_WebRoot + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            {
                ctx.Response.StatusCode = 404;
                await ctx.Response.Send().ConfigureAwait(false);
                return;
            }
            if (!File.Exists(fullPath) && !Path.HasExtension(path)) fullPath = Path.Combine(_WebRoot, "index.html");
            if (!File.Exists(fullPath))
            {
                ctx.Response.StatusCode = 404;
                await ctx.Response.Send("Build the dashboard with npm run build --prefix dashboard.").ConfigureAwait(false);
                return;
            }
            ctx.Response.StatusCode = 200;
            ctx.Response.ContentType = Path.GetExtension(fullPath) switch
            {
                ".html" => "text/html; charset=utf-8", ".js" => "text/javascript; charset=utf-8",
                ".css" => "text/css; charset=utf-8", ".png" => "image/png", ".svg" => "image/svg+xml", _ => "application/octet-stream"
            };
            await ctx.Response.Send(await File.ReadAllBytesAsync(fullPath, ctx.Token).ConfigureAwait(false)).ConfigureAwait(false);
        }

        internal static void SecureHeaders(HttpContextBase ctx)
        {
            ctx.Response.Headers.Set("Cache-Control", "no-store");
            ctx.Response.Headers.Set("X-Content-Type-Options", "nosniff");
            ctx.Response.Headers.Set("Referrer-Policy", "no-referrer");
            ctx.Response.Headers.Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
        }
    }
}
