import { test } from '@playwright/test';
import { prepareEnvironment } from '@shimkiv/cli-testing-library';
import { ExecaChildProcess, execa } from 'execa';
import fsExtra from 'fs-extra';
import crypto from 'node:crypto';
import portfinder from 'portfinder';
import Constants from '../../src/lib/constants.js';
import { LandingPage } from '../pages/example/LandingPage.js';
import {
  killTheProcess,
  removeEnvCustomLoaders,
} from '../utils/common-utils.js';
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
    }) => {
      const serverStdOut: string[] = [];
      const serverStdErr: string[] = [];
      const devServerPort = await portfinder.getPortPromise();
      const devServerUrl = new URL(`http://localhost:${devServerPort}`);
      const projectName = crypto.randomUUID();
      const { spawn, cleanup, path } = await prepareEnvironment();
      let devServerProcess: ExecaChildProcess | undefined = undefined;
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
          devServerProcess = execa(
            'npm',
            ['run', 'dev', '--', '--port', `${devServerPort}`],
            {
              cwd: `${path}/${projectName}/ui`,
            }
          );
          addServerOutputListeners(devServerProcess);
          await waitForServer(devServerUrl);
        });
        await test.step('Interact with the zkApp UI in browser', async () => {
          const exampleLandingPage = new LandingPage(
            devServerUrl,
            page,
            context
          );
          await exampleLandingPage.goto();
          await exampleLandingPage.openDocsPage();
          await exampleLandingPage.openTutorialsPage();
          await exampleLandingPage.openQuestionsPage();
          await exampleLandingPage.openDeployPage();
        });
      } finally {
        console.info('\nCleaning up...');
        await killTheProcess(devServerProcess);
        logServerOutput();
        try {
          fsExtra.rmdirSync(`${path}/${projectName}/ui`, {
            maxRetries: 3,
            retryDelay: 500,
            recursive: true,
          });
        } catch (e) {
          console.error(
            `Failed to remove ${path}/${projectName}/ui directory: ${e}`
          );
        }
        await cleanup();
      }

      // The following 3 methods are part of the `test` class instance
      // because we want tests to run in parallel.
      function addServerOutputListeners(serverProcess: ExecaChildProcess) {
        serverProcess.stdout?.on('data', (data) => {
          serverStdOut.push(data.toString());
        });
        serverProcess.stderr?.on('data', (data) => {
          serverStdErr.push(data.toString());
        });
      }

      async function waitForServer(serverUrl: URL): Promise<void> {
        const maxAttempts = 5;
        const pollingIntervalMs = 3_000;
        let currentAttempt = 1;
        let isReady = false;

        console.info('\n');
        while (currentAttempt <= maxAttempts && !isReady) {
          console.info(
            `Waiting for server readiness. Attempt #${currentAttempt}`
          );
          if (
            serverStdOut.some(
              // We want to check data presence in process stdout independently
              // because CLI output is usually formatted and colored using
              // different libs and styles.
              (item) =>
                item.includes(`${serverUrl.protocol}`) &&
                item.includes(`${serverUrl.hostname}`) &&
                item.includes(`${serverUrl.port}`)
            )
          ) {
            isReady = true;
            break;
          } else {
            await new Promise((resolve) =>
              setTimeout(resolve, pollingIntervalMs)
            );
          }
          currentAttempt++;
        }
        if (!isReady) {
          throw new Error('Maximum attempts reached. The server is not ready!');
        } else {
          console.info('\nServer is up and running!');
        }
      }

      function logServerOutput() {
        if (serverStdOut.length !== 0) {
          console.info('\nServer StdOut:');
          console.info(serverStdOut.join(''));
          console.info('\n--------------------');
        }
        if (serverStdErr.length !== 0) {
          console.info('\nServer StdErr:');
          console.info(serverStdErr.join(''));
          console.info('\n--------------------');
        }
      }
    });
  }
});
