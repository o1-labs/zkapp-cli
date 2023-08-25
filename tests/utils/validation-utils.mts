import { expect } from '@playwright/test';
import { ExitCode } from '@shimkiv/cli-testing-library/lib/createExecute.js';
import { CLITestEnvironment } from '@shimkiv/cli-testing-library/lib/types.js';
import fs from 'node:fs';
import { Constants } from '../../src/lib/constants.js';
import {
  ExampleType,
  KeyPair,
  UiType,
  ZkConfigCommandResults,
} from '../models/types.mjs';
import { listCachedFeePayerAliases } from './common-utils.mjs';
import {
  findTxnByHash,
  getAccountDetails,
  isMockedMinaGraphQlEndpointInUse,
  waitForTxnToBeAddedIntoBlock,
} from './network-utils.mjs';

export async function checkProjectGenerationResults(
  projectName: string,
  uiType: UiType,
  stdOut: string[],
  exitCode: ExitCode | null,
  listFilesystemFn: CLITestEnvironment['ls'],
  existsOnFilesystemFn: CLITestEnvironment['exists']
): Promise<void> {
  const contractsPath = `./${projectName}/contracts`;
  const uiPath = `./${projectName}/ui`;

  expect(exitCode).toBe(0);
  expect(stdOut).toContain('Success!');
  expect(stdOut).toContain('Next steps:');
  expect(await existsOnFilesystemFn(`./${projectName}`)).toBe(true);
  expect(await existsOnFilesystemFn(`${projectName}/.git`)).toBe(true);
  expect((await listFilesystemFn(`./${projectName}`)).length).toBeGreaterThan(
    0
  );
  expect(
    (await listFilesystemFn(`./${projectName}/.git`)).length
  ).toBeGreaterThan(0);

  switch (uiType) {
    case 'next':
    case 'svelte':
    case 'nuxt': {
      await checkSmartContractsFilesystem(
        contractsPath,
        true,
        listFilesystemFn,
        existsOnFilesystemFn
      );
      await checkUiFilesystem(uiPath, listFilesystemFn, existsOnFilesystemFn);
      break;
    }
    case 'empty': {
      await checkSmartContractsFilesystem(
        contractsPath,
        true,
        listFilesystemFn,
        existsOnFilesystemFn
      );
      expect(await existsOnFilesystemFn(uiPath)).toBe(true);
      expect((await listFilesystemFn(uiPath)).length).toBe(0);
      break;
    }
    case 'none': {
      await checkSmartContractsFilesystem(
        `./${projectName}`,
        true,
        listFilesystemFn,
        existsOnFilesystemFn
      );
      expect(await existsOnFilesystemFn(uiPath)).toBe(false);
      break;
    }
  }
}

export async function checkExampleProjectGenerationResults(
  exampleType: ExampleType,
  stdOut: string[],
  exitCode: ExitCode | null,
  listFilesystemFn: CLITestEnvironment['ls'],
  existsOnFilesystemFn: CLITestEnvironment['exists']
): Promise<void> {
  const path = `./${exampleType}`;
  expect(exitCode).toBe(0);
  expect(stdOut).toContain('Success!');
  expect(stdOut).toContain('Next steps:');
  await checkSmartContractsFilesystem(
    path,
    false,
    listFilesystemFn,
    existsOnFilesystemFn
  );
  expect(await existsOnFilesystemFn(`${path}/.git`)).toBe(true);
  expect((await listFilesystemFn(`${path}/.git`)).length).toBeGreaterThan(0);
}

export function checkDeploymentAliasCreationResults(
  options: ZkConfigCommandResults
): void {
  const {
    workDir,
    deploymentAlias,
    feePayerAlias,
    feePayerAccount,
    feePayerMgmtType,
    minaGraphQlEndpoint,
    transactionFee,
    stdOut,
    exitCode,
  } = options;
  const sanitizedDeploymentAlias = deploymentAlias.trim().replace(/\s+/g, '-');
  const config = JSON.parse(fs.readFileSync(`${workDir}/config.json`, 'utf8'))
    .deployAliases[sanitizedDeploymentAlias];
  let sanitizedFeePayerAlias;
  let cachedFeePayerAccountPath;

  expect(exitCode).toBe(0);
  expect(stdOut).toContain('Success!');
  expect(stdOut).toContain('Next steps:');
  // TODO: Add more StdOut checks after the fix of (don't forget about table view of the aliases):
  // - https://github.com/o1-labs/zkapp-cli/issues/456

  switch (feePayerMgmtType) {
    case 'recover':
    case 'new': {
      sanitizedFeePayerAlias = feePayerAlias.trim().replace(/\s+/g, '-');
      cachedFeePayerAccountPath = `${Constants.feePayerCacheDir}/${sanitizedFeePayerAlias}.json`;

      expect(
        listCachedFeePayerAliases().includes(sanitizedFeePayerAlias)
      ).toBeTruthy();
      if (feePayerMgmtType === 'recover') {
        const cachedFeePayerAccount = JSON.parse(
          fs.readFileSync(cachedFeePayerAccountPath, 'utf8')
        ) as KeyPair;
        expect(cachedFeePayerAccount.publicKey).toEqual(feePayerAccount.pk);
        expect(cachedFeePayerAccount.privateKey).toEqual(feePayerAccount.sk);
      }
      break;
    }
    case 'cached': {
      sanitizedFeePayerAlias = listCachedFeePayerAliases()[0];
      break;
    }
    default: {
      sanitizedFeePayerAlias = feePayerMgmtType.trim().replace(/\s+/g, '-');
      break;
    }
  }

  cachedFeePayerAccountPath = `${Constants.feePayerCacheDir}/${sanitizedFeePayerAlias}.json`;
  expect(JSON.stringify(config)).toEqual(
    JSON.stringify({
      url: minaGraphQlEndpoint,
      keyPath: `keys/${sanitizedDeploymentAlias}.json`,
      feepayerKeyPath: cachedFeePayerAccountPath,
      feepayerAlias: sanitizedFeePayerAlias,
      fee: transactionFee,
    })
  );
}

export async function checkZkAppDeploymentResults(
  zkAppPublicKey: string | undefined,
  exitCode: ExitCode | null,
  stdOut: string[]
): Promise<void> {
  const blockchainExplorerLink =
    stdOut.at(-1)!.trim().length === 0
      ? stdOut.at(-2)!.trim()
      : stdOut.at(-1)!.trim();
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
    expect(txnDetails?.failureReason).toBeUndefined();
  }
  expect(account?.verificationKey).not.toBeUndefined();
  expect(account?.verificationKey?.verificationKey).not.toBeUndefined();
  expect(account?.verificationKey?.verificationKey.length).toBeGreaterThan(0);
}

export async function checkZkAppInteractionResults(
  smartContractName: string,
  zkAppPublicKey: string | undefined,
  exitCode: ExitCode | null,
  stdOut: string[]
): Promise<void> {
  const blockchainExplorerLink =
    stdOut.at(-1)!.trim().length === 0
      ? stdOut.at(-2)!.trim()
      : stdOut.at(-1)!.trim();
  const transactionHash = blockchainExplorerLink.substring(
    blockchainExplorerLink.length - 52
  );
  await waitForTxnToBeAddedIntoBlock(transactionHash);
  const account = await getAccountDetails(zkAppPublicKey!);

  expect(exitCode).toBe(0);
  switch (smartContractName) {
    case 'Add': {
      expect(stdOut).toContain('Success! Update transaction sent.');
      if (!(await isMockedMinaGraphQlEndpointInUse())) {
        const txnDetails = await findTxnByHash(transactionHash);
        expect(txnDetails?.failureReason).toBeUndefined();
      }
      expect(Number(account?.zkappState?.[0])).toBeGreaterThan(1);
      break;
    }
  }
}

async function checkSmartContractsFilesystem(
  path: string,
  checkKeysExistence: boolean,
  listFilesystemFn: CLITestEnvironment['ls'],
  existsOnFilesystemFn: CLITestEnvironment['exists']
): Promise<void> {
  expect(await existsOnFilesystemFn(path)).toBe(true);
  expect((await listFilesystemFn(path)).length).toBeGreaterThan(0);
  if (checkKeysExistence) {
    expect(await existsOnFilesystemFn(`${path}/keys`)).toBe(true);
  }
  expect(await existsOnFilesystemFn(`${path}/config.json`)).toBe(true);
  expect(await existsOnFilesystemFn(`${path}/package.json`)).toBe(true);
}

async function checkUiFilesystem(
  path: string,
  listFilesystemFn: CLITestEnvironment['ls'],
  existsOnFilesystemFn: CLITestEnvironment['exists']
): Promise<void> {
  expect((await listFilesystemFn(path)).length).toBeGreaterThan(0);
  expect(await existsOnFilesystemFn(`${path}/package.json`)).toBe(true);
}
