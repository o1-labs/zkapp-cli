import { expect, test } from '@playwright/test';
import { prepareEnvironment } from '@shimkiv/cli-testing-library';
import fs from 'fs-extra';
import crypto from 'node:crypto';
import { createDeploymentAlias, generateProject } from '../utils/cli-utils.mjs';
import {
  Constants,
  cleanupFeePayerCacheByAlias,
} from '../utils/common-utils.mjs';
import {
  acquireAvailableAccount,
  getMinaGraphQlEndpoint,
  releaseAcquiredAccount,
} from '../utils/network-utils.mjs';

test.describe('zkApp-CLI', () => {
  // TODO: https://github.com/o1-labs/zkapp-cli/issues/454
  test(`should not create deployment alias if not within the project dir, @parallel @smoke @config @fail-cases`, async () => {
    const cliArg = 'config';
    const { execute, cleanup, path } = await prepareEnvironment();
    console.info(`[Test Execution] Path: ${path}`);
    try {
      const { code, stdout } = await execute('zk', cliArg);
      console.info(`[CLI StdOut] zk ${cliArg}: ${JSON.stringify(stdout)}`);

      expect(code).toBe(0);
      expect(stdout.at(-1)).toContain(
        "config.json not found. Make sure you're in a zkApp project directory."
      );
    } finally {
      await cleanup();
    }
  });

  test(`should not create deployment alias if procedure was cancelled, @parallel @smoke @config @fail-cases`, async () => {
    const projectName = crypto.randomUUID();
    const deploymentAlias = crypto.randomUUID();
    const feePayerAlias = crypto.randomUUID();
    const feePayerAccount = await acquireAvailableAccount();
    const minaGraphQlEndpoint = await getMinaGraphQlEndpoint();
    const { spawn, cleanup, path } = await prepareEnvironment();
    console.info(`[Test Execution] Path: ${path}`);

    try {
      await test.step('Project generation', async () => {
        await generateProject(projectName, 'none', true, spawn);
      });
      await test.step('Deployment alias creation cancellation', async () => {
        const { exitCode } = await createDeploymentAlias(spawn, {
          deploymentAlias,
          feePayerAlias,
          feePayerPrivateKey: feePayerAccount.sk,
          feePayerType: 'recover',
          minaGraphQlEndpoint,
          transactionFee: '0.01',
          interruptProcess: true,
          runFrom: `./${projectName}`,
          waitForCompletion: true,
        });
        expect(exitCode).toBeGreaterThan(0);
        expect(
          fs.existsSync(`${Constants.feePayerCacheDir}/${feePayerAlias}`)
        ).toBeFalsy();
        expect(
          JSON.stringify(fs.readJsonSync(`${path}/${projectName}/config.json`))
        ).toEqual(JSON.stringify(Constants.defaultProjectConfig));
      });
    } finally {
      // Just in case, should not be created as validated above
      cleanupFeePayerCacheByAlias(feePayerAlias);
      await releaseAcquiredAccount(feePayerAccount);
      await cleanup();
    }
  });

  // TODO: Input fields validation (deployment alias, fee payer, etc.) including duplicates
  // - https://github.com/o1-labs/zkapp-cli/issues/428
  // TODO: Deployment alias creation and validation
  // - with and without already existing fee payer cache (parallel and serial tests)
  // - fee payer cases
  // - cleanup (for parallel - specific fee payer and serial - cache dir in general)
  // - more than 1 or 2 deployment alias for project
});
