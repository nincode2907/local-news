import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { config } from "dotenv";

const [mode, ...args] = process.argv.slice(2);
if (!["dev", "start"].includes(mode)) {
  throw new Error(
    "Usage: node scripts/run-next.mjs dev|start [Next.js options]",
  );
}

// Load PORT before the CLI parses its options. Avoid Node --env-file flags:
// Next dev propagates Node flags to worker NODE_OPTIONS, where they are forbidden.
config({ path: ".env.local", quiet: true });
const require = createRequire(import.meta.url);
const child = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    mode,
    "--hostname",
    "127.0.0.1",
    ...args,
  ],
  { env: process.env, stdio: "inherit" },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => {
  console.error("Không khởi động được Next.js:", error.message);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode =
    code ?? (signal === "SIGINT" ? 130 : signal === "SIGTERM" ? 143 : 1);
});
