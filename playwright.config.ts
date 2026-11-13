import { devices, type PlaywrightTestConfig } from '@playwright/test';
import { getMockedEndpointsServiceEndpoint } from './tests/utils/network-utils.js';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
  testDir: './tests',
  outputDir: './reports/test-artifacts',
  // Keep this well below the CI job `timeout-minutes` so that a stuck test
  // fails (and gets reported) instead of being killed with the whole job.
  // The slowest tests (zkApp deployment, UI project generation) take about
  // 4 minutes on Linux. A test and its retry must not use the job budget.
  timeout: 30 * 60 * 1000,
  expect: {
    timeout: 15 * 1000,
  },
  // Please be aware that parallel tests execution causes tests flackiness.
  // Usually because of: ZlibError: zlib: invalid stored block lengths
  // Consider to use it for local development only.
  workers: '25%',
  fullyParallel: true,
  retries: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: './reports/html-report', open: 'never' }],
    ['junit', { outputFile: './reports/test-execution-results.xml' }],
  ],
  // Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions.
  use: {
    browserName: 'chromium',
    // Without a limit, an action on a page that shows a build error (for
    // example, a click on a link that is not rendered) waits until the test
    // timeout.
    actionTimeout: 2 * 60 * 1000,
    // The first request to a UI dev server compiles the page (about 70 s for
    // Next.js on a CI runner).
    navigationTimeout: 5 * 60 * 1000,
    headless: !!process.env.CI,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },
    video: 'on-first-retry',
    trace: 'retain-on-failure',
  },
  testIgnore: ['*.js'],
  projects: [
    {
      name: 'cli',
      testMatch: '**/cli/**/*.spec.ts',
    },
    {
      name: 'chromium-desktop',
      use: {
        browserName: 'chromium',
        ...devices['Desktop Chrome'],
      },
      testMatch: ['**/ui/**/*.spec.ts'],
    },
    {
      name: 'firefox-desktop',
      use: {
        browserName: 'firefox',
        ...devices['Desktop Firefox'],
      },
      testMatch: ['**/ui/**/*.spec.ts'],
    },
    {
      name: 'webkit-desktop',
      use: {
        browserName: 'webkit',
        ...devices['Desktop Safari'],
      },
      testMatch: ['**/ui/**/*.spec.ts'],
    },
  ],
  webServer: {
    command: 'node ./build/tests/mocks/mocked-endpoints.js',
    url: getMockedEndpointsServiceEndpoint(),
    timeout: 30 * 1000,
  },
};

export default config;
