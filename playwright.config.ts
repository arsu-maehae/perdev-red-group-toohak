import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.TOOHAK_BASE_URL ?? 'http://127.0.0.1:4173/perdev-red-group-toohak/',
    trace: 'on-first-retry',
  },
  webServer: process.env.TOOHAK_BASE_URL
    ? undefined
    : { command: 'npm run preview -- --host 127.0.0.1', url: 'http://127.0.0.1:4173/perdev-red-group-toohak/', reuseExistingServer: true },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'chrome' } }],
})
