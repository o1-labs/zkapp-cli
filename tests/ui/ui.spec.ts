import { test } from '@playwright/test';
import { prepareEnvironment } from '@shimkiv/cli-testing-library';
import fsExtra from 'fs-extra';
import crypto from 'node:crypto';
import os from 'node:os';
import portfinder from 'portfinder';
import Constants from '../../src/lib/constants.js';
import { LandingPage } from '../pages/example/LandingPage.js';
import { closeBrowser } from '../utils/browser-utils.js';
import { logProcessOutput, waitForServer } from '../utils/cli-utils.js';
import { removeEnvCustomLoaders } from '../utils/common-utils.js';
import { zkProject } from '../utils/project-utils.js';

const actualUiTypes = Constants.uiTypes.filter(
  (uiType) => uiType !== 'none' && uiType !== 'empty'
);

test.beforeAll(removeEnvCustomLoaders);

test.describe('Users', () => {
  for (const uiType of actualUiTypes) {
    test(`should be able to interact in browser with zkApp project of ${uiType.toUpperCase()} UI type using Dev server, @parallel @e2e @in-browser @${uiType}-ui`, async ({
      page,
      context,
      browserName,
    }) => {
      // https://github.com/sveltejs/svelte/issues/8595
      test.skip(
        (os.platform() === 'win32' && uiType === 'svelte') ||
          (browserName === 'webkit' && os.platform() !== 'darwin'),
        'Skipping tests in certain conditions (zkApp project generation for Svelte UI type on Windows and Webkit browser on non-Darwin platforms).'
      );

      const devServerPort = await portfinder.getPortPromise();
      const devServerUrl = new URL(`http://localhost:${devServerPort}`);
      const projectName = crypto.randomUUID();
      const { spawn, cleanup, path } = await prepareEnvironment();
      let killDevServerProcess: (signal: NodeJS.Signals) => void = () => {}; // eslint-disable-line
      let getDevServerStdout: () => string[] = () => [];
      let getDevServerStderr: () => string[] = () => [];
      console.info(`[Test Execution] Path: ${path}`);

      try {
        // Pre-generating projects for every test batches (batch per browser)
        // does NOT save us much time but instead introduces flakiness
        // especially when it comes to retries by any possible reasons.
        // This is why we generate zkApp projects for each test individually.
        await test.step(`Generate zkApp project of ${uiType.toUpperCase()} UI type`, async () => {
          await zkProject(projectName, uiType, true, spawn);
        });
        await test.step('Start Dev server', async () => {
          let devServerCommand: string = '';
          switch (uiType) {
            case 'next':
              devServerCommand = 'next';
              break;
            case 'svelte':
              devServerCommand = 'vite';
              break;
            case 'nuxt':
              devServerCommand = 'nuxt';
              break;
          }
          const { debug, getStdout, getStderr, kill } = await spawn(
            'npx',
            `${devServerCommand} dev --port ${devServerPort}`,
            `./${projectName}/ui`
          );
          debug();
          killDevServerProcess = kill!;
          getDevServerStdout = getStdout!;
          getDevServerStderr = getStderr!;
          await waitForServer(devServerUrl, getDevServerStdout);
        });
        await test.step('Interact with the zkApp UI in browser', async () => {
          const exampleLandingPage = new LandingPage(
            devServerUrl,
            page,
            context,
            browserName,
            uiType
          );
          await exampleLandingPage.goto();
          await exampleLandingPage.checkPageLabels();
          await exampleLandingPage.openDocsPage();
          await exampleLandingPage.openTutorialsPage();
          await exampleLandingPage.openQuestionsPage();
          await exampleLandingPage.openDeployPage();
        });
      } finally {
        console.info('\nCleaning up...');
        await closeBrowser(context);
        // Investigate the issue with correct child processes termination in current setup.
        // https://github.com/o1-labs/zkapp-cli/issues/558
        killDevServerProcess('SIGKILL');
        logProcessOutput(getDevServerStdout(), getDevServerStderr());
        try {
          fsExtra.rmdirSync(`${path}/${projectName}/ui`, {
            maxRetries: 3,
            retryDelay: 500,
            recursive: true,
          });
          await cleanup();
        } catch (e) {
          console.error(
            `Failed to cleanup the path ${path}/${projectName} with error: ${e}`
          );
        }
      }
    });
  }
});
