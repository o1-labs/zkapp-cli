import { expect, test } from '@playwright/test';
import { prepareEnvironment } from '@shimkiv/cli-testing-library';
import fs from 'fs-extra';
import crypto from 'node:crypto';
import {
  createDeploymentAlias,
  generateProject,
  maybeCreateDeploymentAlias,
} from '../utils/cli-utils.mjs';
import {
  Constants,
  cleanupFeePayerCache,
  cleanupFeePayerCacheByAlias,
  restoreFeePayerCache,
} from '../utils/common-utils.mjs';
import {
  acquireAvailableAccount,
  getMinaGraphQlEndpoint,
  releaseAcquiredAccount,
} from '../utils/network-utils.mjs';
import { checkDeploymentAliasCreationResults } from '../utils/validation-utils.mjs';

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
          feePayerMgmtType: 'recover',
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

  test(`should properly validate input field values, @serial @smoke @config`, async () => {
    const projectName = crypto.randomUUID();
    const deploymentAlias = crypto.randomUUID();
    const feePayerAlias = crypto.randomUUID();
    // Serial because of  the following new aliases
    const newDeploymentAlias = '  this is  the   deployment    alias  ';
    const newFeePayerAlias = '  this is  the   fee-payer    alias  ';
    const feePayerAccount = await acquireAvailableAccount();
    const feePayerMgmtType = 'recover';
    const minaGraphQlEndpoint = await getMinaGraphQlEndpoint();
    const transactionFee = '0.01';
    const { spawn, cleanup, path } = await prepareEnvironment();
    console.info(`[Test Execution] Path: ${path}`);

    try {
      await test.step('Project generation and deployment alias creation', async () => {
        await generateProject(projectName, 'none', true, spawn);
        await createDeploymentAlias(spawn, {
          deploymentAlias,
          feePayerAlias,
          feePayerPrivateKey: feePayerAccount.sk,
          feePayerMgmtType,
          minaGraphQlEndpoint,
          transactionFee,
          interruptProcess: false,
          runFrom: `./${projectName}`,
          waitForCompletion: true,
        });
      });
      await test.step('Input field values validation', async () => {
        let bypassCachedAccountSelectionInteractiveDialog = {
          'Use stored account': ['arrowDown', 'enter'],
        };

        const { exitCode, stdOut } = await maybeCreateDeploymentAlias(spawn, {
          runFrom: `./${projectName}`,
          waitForCompletion: true,
          interactiveDialog: {
            'Create a name (can be anything)': ['enter'],
            'Name is required': ['  ', 'enter'],
            'Name is required.': [
              'backSpace',
              'backSpace',
              deploymentAlias,
              'enter',
            ],
            'Name already exists': [
              ...Array.from(
                { length: deploymentAlias.length },
                () => 'backSpace'
              ),
              ` ${deploymentAlias} `,
              'enter',
            ],
            'Name already exists.': [
              'backSpace',
              'backSpace',
              ...Array.from(
                { length: deploymentAlias.length },
                () => 'backSpace'
              ),
              newDeploymentAlias,
              'enter',
            ],
            'Set the Mina GraphQL API URL to deploy to': ['enter'],
            // TODO: Add more URL validation cases after the fix of:
            // - https://github.com/o1-labs/zkapp-cli/issues/428
            'Url is required': [minaGraphQlEndpoint, 'enter'],
            'Set transaction fee to use when deploying': ['enter'],
            'Fee is required': [' -1 ', 'enter'],
            // TODO: Add more Fee validation cases after the fix of:
            // - https://github.com/o1-labs/zkapp-cli/issues/428
            "Fee can't be negative": [
              'backSpace',
              'backSpace',
              'backSpace',
              'backSpace',
              `  ${transactionFee}  `,
              'enter',
            ],
            ...bypassCachedAccountSelectionInteractiveDialog,
            'Recover fee payer account from an existing base58 private key': [
              'enter',
            ],
            'Create an alias for this account': ['enter'],
            'Fee payer alias is required': [feePayerAlias, 'enter'],
            // TODO: Add more Fee Payer Alias validation cases after the fix of:
            // - https://github.com/o1-labs/zkapp-cli/issues/462
            // - https://github.com/o1-labs/zkapp-cli/issues/463
            'already exists': [
              ...Array.from(
                { length: feePayerAlias.length },
                () => 'backSpace'
              ),
              newFeePayerAlias,
              'enter',
            ],
            'Account private key (base58)': ['enter'],
            'Enter a valid private key': ['  ', 'enter'],
            'Enter a valid private key.': [
              'backSpace',
              'backSpace',
              `${feePayerAccount.sk.substring(
                0,
                feePayerAccount.sk.length - 1
              )}#`,
              'enter',
            ],
            // Yeah, not perfect text pattern but it's acceptable for the tests
            'Enter a valid private ke': [
              ...Array.from(
                { length: feePayerAccount.sk.length },
                () => 'backSpace'
              ),
              `  ${feePayerAccount.sk}  `,
              'enter',
            ],
          },
        });

        checkDeploymentAliasCreationResults({
          workDir: `${path}/${projectName}`,
          deploymentAlias: newDeploymentAlias,
          feePayerAlias: newFeePayerAlias,
          feePayerAccount,
          feePayerMgmtType,
          minaGraphQlEndpoint,
          transactionFee,
          stdOut,
          exitCode,
        });
      });
    } finally {
      cleanupFeePayerCacheByAlias(feePayerAlias);
      cleanupFeePayerCacheByAlias(newFeePayerAlias);
      await releaseAcquiredAccount(feePayerAccount);
      await cleanup();
    }
  });

  test(`should create deployment alias in case of no cached fee payer account available, @serial @smoke @config`, async () => {
    const projectName = crypto.randomUUID();
    const deploymentAlias = crypto.randomUUID();
    const feePayerAlias = crypto.randomUUID();
    const feePayerAccount = await acquireAvailableAccount();
    const feePayerMgmtType = 'recover';
    const minaGraphQlEndpoint = await getMinaGraphQlEndpoint();
    const transactionFee = '0.01';
    const { spawn, cleanup, path } = await prepareEnvironment();
    console.info(`[Test Execution] Path: ${path}`);

    try {
      await test.step('Project generation', async () => {
        await generateProject(projectName, 'none', true, spawn);
      });
      await test.step('Cleanup Fee Payer cache', async () => {
        cleanupFeePayerCache();
      });
      await test.step('Deployment alias creation and results validation', async () => {
        const { exitCode, stdOut } = await createDeploymentAlias(spawn, {
          deploymentAlias,
          feePayerAlias,
          feePayerPrivateKey: feePayerAccount.sk,
          feePayerMgmtType,
          minaGraphQlEndpoint,
          transactionFee,
          interruptProcess: false,
          runFrom: `./${projectName}`,
          waitForCompletion: true,
        });
        checkDeploymentAliasCreationResults({
          workDir: `${path}/${projectName}`,
          deploymentAlias,
          feePayerAlias,
          feePayerAccount,
          feePayerMgmtType,
          minaGraphQlEndpoint,
          transactionFee,
          stdOut,
          exitCode,
        });
      });
    } finally {
      restoreFeePayerCache();
      await releaseAcquiredAccount(feePayerAccount);
      await cleanup();
    }
  });

  test(`should create deployment aliases using available fee payer account management approaches, @serial @smoke @config`, async () => {
    const projectName = crypto.randomUUID();
    let deploymentAlias = crypto.randomUUID();
    let feePayerAlias = crypto.randomUUID();
    const feePayerAccount = await acquireAvailableAccount();
    const minaGraphQlEndpoint = await getMinaGraphQlEndpoint();
    const transactionFee = '0.01';
    const { spawn, cleanup, path } = await prepareEnvironment();
    console.info(`[Test Execution] Path: ${path}`);

    try {
      await test.step('Project generation', async () => {
        await generateProject(projectName, 'none', true, spawn);
      });
      await test.step('Cleanup Fee Payer cache', async () => {
        cleanupFeePayerCache();
      });
      for (const feePayerMgmtType of Constants.feePayerMgmtTypes) {
        deploymentAlias = crypto.randomUUID();
        if (feePayerMgmtType !== 'cached') {
          feePayerAlias = crypto.randomUUID();
        }
        await test.step(`Deployment alias creation (feePayerMgmtType=${feePayerMgmtType}) and results validation`, async () => {
          const { exitCode, stdOut } = await createDeploymentAlias(spawn, {
            deploymentAlias,
            feePayerAlias,
            feePayerPrivateKey: feePayerAccount.sk,
            feePayerMgmtType,
            minaGraphQlEndpoint,
            transactionFee,
            interruptProcess: false,
            runFrom: `./${projectName}`,
            waitForCompletion: true,
          });
          checkDeploymentAliasCreationResults({
            workDir: `${path}/${projectName}`,
            deploymentAlias,
            feePayerAlias,
            feePayerAccount,
            feePayerMgmtType,
            minaGraphQlEndpoint,
            transactionFee,
            stdOut,
            exitCode,
          });
        });
      }
      deploymentAlias = crypto.randomUUID();
      await test.step(`Deployment alias creation (feePayerMgmtType=another) and results validation`, async () => {
        const { exitCode, stdOut } = await createDeploymentAlias(spawn, {
          deploymentAlias,
          feePayerAlias,
          feePayerPrivateKey: feePayerAccount.sk,
          feePayerMgmtType: feePayerAlias,
          minaGraphQlEndpoint,
          transactionFee,
          interruptProcess: false,
          runFrom: `./${projectName}`,
          waitForCompletion: true,
        });
        checkDeploymentAliasCreationResults({
          workDir: `${path}/${projectName}`,
          deploymentAlias,
          feePayerAlias,
          feePayerAccount,
          feePayerMgmtType: feePayerAlias,
          minaGraphQlEndpoint,
          transactionFee,
          stdOut,
          exitCode,
        });
      });
    } finally {
      restoreFeePayerCache();
      await releaseAcquiredAccount(feePayerAccount);
      await cleanup();
    }
  });

  // TODO: Add more tests after the fix of:
  // - https://github.com/o1-labs/zkapp-cli/issues/461
});
