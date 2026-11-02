import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
process.chdir(root);
const services = [];
const mockUrl = "http://127.0.0.1:9090/ollama";
fs.mkdirSync("artifacts", { recursive: true });
const env = { ...process.env, OLLAMA_BASE_URL: mockUrl };
function launch(command, args, log) {
  const file = fs.openSync(log, "w");
  const child = spawn(command, args, {
    env,
    stdio: ["ignore", file, file],
    shell: process.platform === "win32",
  });
  child.on("error", (error) => console.error(error));
  services.push(child);
  return child;
}
function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args.join(" ")} exited ${code}`)),
    );
  });
}
async function ready(url) {
  for (let i = 0; i < 150; i++) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: "Bearer test" },
        signal: AbortSignal.timeout(1000),
      });
      if (res.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Service did not start: ${url}. See artifacts/*.log`);
}
try {
  await run("npm", ["run", "build", "--prefix", "dashboard"]);
  await run("npm", ["test", "--prefix", "dashboard"]);
  launch(
    "postman",
    [
      "simulation",
      "run",
      "postman/simulations/ollama.sim.yaml",
      "--port",
      "9090",
      "--output",
      "ndjson",
    ],
    "artifacts/simulation.log",
  );
  await ready(mockUrl + "/api/balance");
  await run("dotnet", [
    "run",
    "--project",
    "test/Test.Automated",
    "-c",
    "Release",
  ]);
  launch(
    "dotnet",
    [
      "run",
      "--project",
      "src/OllamaCloudMonitor.Server",
      "-c",
      "Release",
      "--no-build",
    ],
    "artifacts/server.log",
  );
  await ready("http://127.0.0.1:8080/v1.0/api/health");
  await run("postman", [
    "spec",
    "lint",
    "postman/specs/monitor.openapi.json",
    "--issueType=syntax",
  ]);
  await run("postman", ["collection", "lint", "postman/collections/monitor"]);
  // Synthetic credentials only. Supply real credentials through the UI, never command-line arguments.
  await run("postman", [
    "collection",
    "run",
    "postman/collections/monitor",
    "--env-var",
    "baseUrl=http://127.0.0.1:8080",
    "--env-var",
    "bearerToken=test",
  ]);
  await run("npm", ["run", "test:browser", "--prefix", "dashboard"]);
  await run("dotnet", [
    "publish",
    "test/Test.Aot",
    "-c",
    "Release",
    "--self-contained",
    "true",
    "-o",
    "artifacts/test-aot",
  ]);
  await run(
    path.join(
      root,
      "artifacts/test-aot",
      process.platform === "win32" ? "Test.Aot.exe" : "Test.Aot",
    ),
    [],
  );
  console.log(
    "PASS: all managed, native, frontend, browser, i18n, and API checks.",
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  for (const child of services.reverse()) {
    if (process.platform === "win32")
      await new Promise((resolve) => {
        const stop = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
        stop.on("exit", resolve);
        stop.on("error", resolve);
      });
    else child.kill("SIGINT");
  }
}
