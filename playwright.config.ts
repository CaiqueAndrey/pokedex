import { defineConfig, devices } from "@playwright/test";

const APP_PORT = 3100;
const API_PORT = 4010;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL: `http://localhost:${APP_PORT}`, trace: "on-first-retry" },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  // E2E runs against a local fixtures server, never the real PokeAPI.
  webServer: [
    {
      command: "node e2e/fixture-server.mjs",
      url: `http://localhost:${API_PORT}/api/v2/pokemon`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `yarn next dev -p ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        POKEAPI_BASE_URL: `http://localhost:${API_PORT}/api/v2`,
        NEXT_DIST_DIR: ".next-e2e",
      },
    },
  ],
});
