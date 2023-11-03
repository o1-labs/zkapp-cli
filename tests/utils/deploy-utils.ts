import { expect } from '@playwright/test';
import { ExitCode } from '@shimkiv/cli-testing-library/lib/createExecute';
import { CLITestEnvironment } from '@shimkiv/cli-testing-library/lib/types';
import crypto from 'node:crypto';
import Constants from '../../src/lib/constants.js';
import { CommandResults, ExampleType, UiType } from '../models/types.js';
import { executeInteractiveCommand } from './cli-utils.js';
import {
  cleanupFeePayerCacheByAlias,
  getZkAppAccountFromAlias,
} from './common-utils.js';
import { zkConfig } from './config-utils.js';
import { zkExample } from './example-utils.js';
import {
  acquireAvailableAccount,
  findTxnByHash,
  getAccountDetails,
  getMinaGraphQlEndpoint,
  isMockedMinaGraphQlEndpointInUse,
  releaseAcquiredAccount,
  waitForTxnToBeAddedIntoBlock,
} from './network-utils.js';
import { zkProject } from './project-utils.js';

export async function zkDeploy(
  path: string,
  projectType: UiType | ExampleType,
  interactiveMode: boolean,
  processHandler: CLITestEnvironment['spawn'],
  cancelDeployment = false
): Promise<CommandResults> {
  const projectName = crypto.randomUUID();
  const deploymentAlias = crypto.randomUUID();
  const feePayerAlias = crypto.randomUUID();
  const feePayerAccount = await acquireAvailableAccount();
  const feePayerMgmtType = 'recover';
  const minaGraphQlEndpoint = await getMinaGraphQlEndpoint();
  const transactionFee = '0.01';
  const cliArgs = interactiveMode ? `` : ' --yes ';
  const command = `deploy ${cliArgs} ${deploymentAlias}`.replace(
    /\s{2,}/g,
    ' '
  );
  let interactiveDialog = {};
  let workDir;

  if (interactiveMode) {
    interactiveDialog = {
      ...interactiveDialog,
      'Are you sure you want to send (yes/no)?': [
        cancelDeployment ? 'no' : 'yes',
        'enter',
      ],
    };
  }

  try {
    if ((Constants.exampleTypes as string[]).includes(projectType)) {
      workDir = `./${projectType}`;
      await zkExample(projectType as ExampleType, true, processHandler);
    } else {
      if (projectType !== 'none') {
        workDir = `./${projectName}/contracts`;
      } else {
        workDir = `./${projectName}`;
      }
      await zkProject(projectName, projectType as UiType, true, processHandler);
    }
    await zkConfig({
      processHandler,
      deploymentAlias,
      feePayerAlias,
      feePayerAccount,
      feePayerMgmtType,
      minaGraphQlEndpoint,
      transactionFee,
      interruptProcess: false,
      runFrom: workDir,
      waitForCompletion: true,
    });
    const zkAppPublicKey = getZkAppAccountFromAlias(
      `${path}/${workDir}`,
      deploymentAlias
    ).publicKey;

    const { exitCode, stdOut, stdErr } = await executeInteractiveCommand({
      processHandler,
      runner: 'zk',
      command,
      runFrom: workDir,
      waitForCompletion: true,
      interactiveDialog,
    });

    console.info(`[Deploy CLI StdOut] zk ${command}: ${stdOut}`);
    console.info(`[Deploy CLI StdErr] zk ${command}: ${stdErr}`);

    return { zkAppPublicKey, exitCode, stdOut, stdErr };
  } finally {
    cleanupFeePayerCacheByAlias(feePayerAlias);
    await releaseAcquiredAccount(feePayerAccount);
  }
}

export async function checkZkDeploy(
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
  expect(stdOut).toContain('Success! Deploy transaction sent.');
  expect(stdOut).toContain('Next step:');
  if (!(await isMockedMinaGraphQlEndpointInUse())) {
    const txnDetails = await findTxnByHash(transactionHash);
    expect(txnDetails?.failureReason).toBeNull();
  }
  expect(account?.verificationKey).not.toBeNull();
  expect(account?.verificationKey?.verificationKey).not.toBeNull();
  expect(account?.verificationKey?.verificationKey.length).toBeGreaterThan(0);
}
