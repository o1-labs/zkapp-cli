import { type PlaywrightTestConfig } from '@playwright/test';
import { getMockedEndpointsServiceEndpoint } from './tests/utils/network-utils.js';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
  testDir: './tests',
  outputDir: './reports/test-artifacts',
  timeout: 120 * 60 * 1000,
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
    actionTimeout: 0,
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
    // TODO: We can't use "ts-node" with Npx and Node20 because of the https://github.com/TypeStrong/ts-node/issues/1997
    command: 'node --loader ts-node/esm ./tests/mocks/mocked-endpoints.ts',
    url: getMockedEndpointsServiceEndpoint(),
    timeout: 30 * 1000,
  },
};

export default config;
