import path from "path";
import { defineConfig } from "@playwright/test";

const port = 3456;
const dbFile = path.join(process.cwd(), "data", "e2e.sqlite");

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    serviceWorkers: "allow",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: `npx next start -p ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      OPENWEEK_DB: dbFile,
      COOKIE_SECURE: "",
    },
  },
});
