import { expect, test } from '@playwright/test';
import { prepareEnvironment } from '@shimkiv/cli-testing-library';
import { ExitCode } from '@shimkiv/cli-testing-library/lib/createExecute';
import crypto from 'node:crypto';
import Constants from '../../src/lib/constants.js';
import { executeInteractiveCommand } from '../utils/cli-utils.js';
import {
  cleanupFeePayerCacheByAlias,
  getZkAppAccountFromAlias,
  removeEnvCustomLoaders,
} from '../utils/common-utils.js';
import { zkConfig } from '../utils/config-utils.js';
import { checkZkDeploy } from '../utils/deploy-utils.js';
import { zkExample } from '../utils/example-utils.js';
import {
  acquireAvailableAccount,
  findTxnByHash,
  getAccountDetails,
  getMinaGraphQlEndpoint,
  isMockedMinaGraphQlEndpointInUse,
  releaseAcquiredAccount,
  waitForTxnToBeAddedIntoBlock,
} from '../utils/network-utils.js';
import { zkProject } from '../utils/project-utils.js';

test.describe('Users', () => {
  test.beforeAll(removeEnvCustomLoaders);

  // Tests for interaction with example projects of each type
  for (const exampleType of Constants.exampleTypes) {
    test(`should be able to interact off-chain with an example zkApp of ${exampleType.toUpperCase()} type, @parallel @smoke @off-chain @interaction @${exampleType}`, async () => {
      const { execute, spawn, cleanup, path } = await prepareEnvironment();
      console.info(`[Test Execution] Path: ${path}`);

      try {
        await test.step('Example project generation', async () => {
          await zkExample(exampleType, true, spawn);
        });
        await test.step('Interaction with an example zkApp', async () => {
          const npmRunTestResults = await execute(
            'npm',
            'run test',
            `./${exampleType}`
          );
          expect(npmRunTestResults.code).toBe(0);
          const npmRunBuildResults = await execute(
            'npm',
            'run build',
            `./${exampleType}`
          );
          expect(npmRunBuildResults.code).toBe(0);
          const { code } = await execute(
            'npm',
            'run start',
            `./${exampleType}`
          );
          expect(code).toBe(0);
        });
      } finally {
        await cleanup();
      }
    });
  }

  test(`should be able to interact on-chain with deployed zkApp, @parallel @smoke @on-chain @interaction`, async () => {
    const projectName = crypto.randomUUID();
    const deploymentAlias = crypto.randomUUID();
    const feePayerAlias = crypto.randomUUID();
    const feePayerAccount = await acquireAvailableAccount();
    const feePayerMgmtType = 'recover';
    const minaGraphQlEndpoint = await getMinaGraphQlEndpoint();
    const transactionFee = '0.01';
    let zkAppPublicKey: any;
    const { execute, spawn, cleanup, path } = await prepareEnvironment();
    const workDir = `${path}/${projectName}`;
    console.info(`[Test Execution] Path: ${path}`);

    try {
      await test.step('Project generation', async () => {
        await zkProject(projectName, 'none', true, spawn);
      });
      await test.step('Deployment alias configuration', async () => {
        await zkConfig({
          processHandler: spawn,
          deploymentAlias,
          feePayerAlias,
          feePayerAccount,
          feePayerMgmtType,
          minaGraphQlEndpoint,
          transactionFee,
          interruptProcess: false,
          runFrom: `./${projectName}`,
          waitForCompletion: true,
        });
        zkAppPublicKey = getZkAppAccountFromAlias(
          workDir,
          deploymentAlias
        ).publicKey;
      });
      await test.step('zkApp deployment', async () => {
        const { exitCode, stdOut } = await executeInteractiveCommand({
          processHandler: spawn,
          runner: 'zk',
          command: `deploy --yes ${deploymentAlias}`,
          runFrom: `./${projectName}`,
          waitForCompletion: true,
          interactiveDialog: {},
        });
        await checkZkDeploy(zkAppPublicKey, exitCode, stdOut);
      });
      await test.step('Deployed zkApp interaction and results validation', async () => {
        const interactionCommand = `build/src/interact.js ${deploymentAlias}`;
        const npmRunBuildResults = await execute(
          'npm',
          'run build',
          `./${projectName}`
        );
        expect(npmRunBuildResults.code).toBe(0);
        const { code, stdout, stderr } = await execute(
          'node',
          interactionCommand,
          `./${projectName}`
        );

        console.info(
          `[Interaction CLI StdOut] node ${interactionCommand}: ${stdout}`
        );
        console.info(
          `[Interaction CLI StdErr] node ${interactionCommand}: ${stderr}`
        );

        await checkZkAppInteraction(zkAppPublicKey, code, stdout);
      });
    } finally {
      cleanupFeePayerCacheByAlias(feePayerAlias);
      await releaseAcquiredAccount(feePayerAccount);
      await cleanup();
    }
  });
});

async function checkZkAppInteraction(
  zkAppPublicKey: string | undefined,
  exitCode: ExitCode | null,
  stdOut: string[]
): Promise<void> {
  let blockchainExplorerLink =
    stdOut.at(-1)!.trim().length === 0
      ? stdOut.at(-2)!.trim()
      : stdOut.at(-1)!.trim();
  blockchainExplorerLink = blockchainExplorerLink.split('?')[0];
  const transactionHash = blockchainExplorerLink.substring(
    blockchainExplorerLink.length - 52
  );
  await waitForTxnToBeAddedIntoBlock(transactionHash);
  const account = await getAccountDetails(zkAppPublicKey!);

  expect(exitCode).toBe(0);
  expect(stdOut).toContain('Success! Update transaction sent.');
  if (!(await isMockedMinaGraphQlEndpointInUse())) {
    const txnDetails = await findTxnByHash(transactionHash);
    expect(txnDetails?.failureReason).toBeNull();
  }
  expect(Number(account?.zkappState?.[0])).toBeGreaterThan(1);
}
