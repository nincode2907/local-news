import { defineConfig } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";
const url =
  process.env.TEST_DB_URL ||
  "file:" + join(tmpdir(), "intelligence-e2e-" + Date.now() + ".db");
process.env.TEST_DB_URL = url;
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:15090", browserName: "chromium" },
  webServer: {
    command:
      "npm run db:migrate && npm run db:seed && npm run build && npm run start -- --port 15090",
    url: "http://127.0.0.1:15090",
    reuseExistingServer: false,
    timeout: 120000,
    env: { TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: "" },
  },
});
