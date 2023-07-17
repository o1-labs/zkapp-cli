import { expect } from '@playwright/test';
import fs from 'fs-extra';
import { Constants } from '../utils/common-utils.mjs';
import { listCachedFeePayerAliases } from './common-utils.mjs';

async function checkSmartContractsFilesystem(
  path,
  checkKeysExistence,
  listFilesystemFn,
  existsOnFilesystemFn
) {
  expect(await existsOnFilesystemFn(path)).toBe(true);
  expect((await listFilesystemFn(path)).length).toBeGreaterThan(0);
  if (checkKeysExistence) {
    expect(await existsOnFilesystemFn(`${path}/keys`)).toBe(true);
  }
  expect(await existsOnFilesystemFn(`${path}/config.json`)).toBe(true);
  expect(await existsOnFilesystemFn(`${path}/package.json`)).toBe(true);
}

async function checkUiFilesystem(path, listFilesystemFn, existsOnFilesystemFn) {
  expect((await listFilesystemFn(path)).length).toBeGreaterThan(0);
  expect(await existsOnFilesystemFn(`${path}/package.json`)).toBe(true);
}

export function checkCommandExecutionResults(exitCode, stdErr) {
  expect(exitCode).toBe(0);
  expect(stdErr).toHaveLength(0);
}

export async function checkProjectGenerationResults(
  projectName,
  uiType,
  stdOut,
  exitCode,
  listFilesystemFn,
  existsOnFilesystemFn
) {
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
  exampleType,
  stdOut,
  exitCode,
  listFilesystemFn,
  existsOnFilesystemFn
) {
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

export function checkDeploymentAliasCreationResults(options) {
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
  const sanitizedDeploymentAlias = deploymentAlias
    .trim()
    .replace(/\s{1,}/g, '-');
  const config = fs.readJsonSync(`${workDir}/config.json`).deployAliases[
    `${sanitizedDeploymentAlias}`
  ];
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
      sanitizedFeePayerAlias = feePayerAlias.trim().replace(/\s{1,}/g, '-');
      cachedFeePayerAccountPath = `${Constants.feePayerCacheDir}/${sanitizedFeePayerAlias}.json`;

      expect(
        listCachedFeePayerAliases().includes(sanitizedFeePayerAlias)
      ).toBeTruthy();
      if (feePayerMgmtType === 'recover') {
        const cachedFeePayerAccount = fs.readJsonSync(
          cachedFeePayerAccountPath
        );
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
      sanitizedFeePayerAlias = feePayerMgmtType.trim().replace(/\s{1,}/g, '-');
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

export async function checkZkAppDeploymentResults(exitCode, stdOut) {
  const blockchainExplorerLink = stdOut.at(-1).trim();
  const transactionHash = blockchainExplorerLink.substr(
    blockchainExplorerLink.length - 52
  );

  expect(exitCode).toBe(0);
  expect(stdOut).toContain('Success! Deploy transaction sent.');
  expect(stdOut).toContain('Next step:');

  // TODO: validate zkApp deployment on-chain
}
