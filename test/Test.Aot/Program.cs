namespace OllamaCloudMonitor.Testing.Runner
{
    using System;
    using System.Threading;
    using System.Threading.Tasks;
    using OllamaCloudMonitor.Testing;

    internal static class Program
    {
        private static async Task<int> Main()
        {
            try
            {
                int count = await MonitorSuite.RunAsync(CancellationToken.None).ConfigureAwait(false);
                Console.WriteLine("PASS: " + count + " HTTP integration checks.");
                return 0;
            }
            catch (Exception exception)
            {
                Console.Error.WriteLine(exception);
                return 1;
            }
        }
    }
}
