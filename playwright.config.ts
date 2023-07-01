import { type PlaywrightTestConfig } from '@playwright/test';
import { getMinaMockedGraphQlEndpoint } from './tests/utils/network-utils.mjs';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
  testDir: './tests',
  outputDir: './reports/test-artifacts',
  /* Maximum time one test can run for. */
  timeout: 15 * 60 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 15 * 1000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  /* Opt out of parallel tests (on CI). */
  workers: process.env.CI ? '50%' : '25%',
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['html', { outputFolder: './reports/html-report', open: 'never' }],
    ['junit', { outputFile: './reports/test-execution-results.xml' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    browserName: 'chromium',
    actionTimeout: 0,
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },
    video: 'on-first-retry',
    trace: 'retain-on-failure',
    /* launchOptions: {
      slowMo: 1_500,
    }, */
  },
  testIgnore: ['*.js'],
  /* Configure projects for major browsers */
  projects: [
    {
      name: 'cli',
      testMatch: '**/cli/**/*.spec.ts',
    },
    // {
    //   name: 'chromium-desktop',
    //   use: {
    //     browserName: 'chromium',
    //     ...devices['Desktop Chrome'],
    //   },
    //   testIgnore: ['**/cli/**/*.spec.ts'],
    // },
    // {
    //   name: 'firefox-desktop',
    //   use: {
    //     browserName: 'firefox',
    //     ...devices['Desktop Firefox'],
    //   },
    //   testIgnore: ['**/cli/**/*.spec.ts'],
    // },
    // {
    //   name: 'webkit-desktop',
    //   use: {
    //     browserName: 'webkit',
    //     ...devices['Desktop Safari'],
    //   },
    //   testIgnore: ['**/cli/**/*.spec.ts'],
    // },
  ],
  webServer: {
    command: 'npm run e2e:start:mocked-endpoints',
    url: getMinaMockedGraphQlEndpoint(),
    timeout: 30 * 1000,
  },
};

export default config;
