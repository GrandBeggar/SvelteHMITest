import { defineConfig, devices } from '@playwright/test';

const appPort = 3107;
const gatewayPort = 3108;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${appPort}`,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node server.js',
      url: `http://127.0.0.1:${gatewayPort}/api/health`,
      env: {
        PORT: String(gatewayPort),
        HMI_MODE: 'mock',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 15_000,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${appPort}`,
      url: `http://127.0.0.1:${appPort}`,
      env: {
        HMI_BACKEND_URL: `http://127.0.0.1:${gatewayPort}`,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 20_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
