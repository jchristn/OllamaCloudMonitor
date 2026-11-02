namespace OllamaCloudMonitor.Server
{
    using System;
    using System.Threading;
    using System.Threading.Tasks;

    internal static class Program
    {
        private static async Task Main()
        {
            using CancellationTokenSource shutdown = new CancellationTokenSource();
            Console.CancelKeyPress += (sender, args) => { args.Cancel = true; shutdown.Cancel(); };
            using MonitorServer server = new MonitorServer();
            server.Start();
            try { await Task.Delay(Timeout.Infinite, shutdown.Token).ConfigureAwait(false); }
            catch (OperationCanceledException) when (shutdown.IsCancellationRequested) { }
        }
    }
}
