import { expect } from '@playwright/test';
import { CLITestEnvironment } from '@shimkiv/cli-testing-library/lib/types';
import fs from 'node:fs';
import path from 'node:path';
import Constants from '../../src/lib/constants.js';
import { Constants as ConstantsType, KeyPair } from '../models/types.js';

export const TestConstants: ConstantsType = Object.freeze({
  cliPromptMsDelay: 200,
  minaGraphQlPort: 8080,
  minaAccountsManagerPort: 8181,
  mockedEndpointsServicePort: 8282,
  skipInteractiveSelectionOptions: [false, true],
  feePayerMgmtTypes: ['recover', 'new', 'cached'],
  feePayerTmpCacheDir: path.join(
    path.dirname(Constants.feePayerCacheDir),
    '_keys'
  ),
  recentBlocks: 25,
  specialCliKeys: [
    'arrowDown',
    'arrowLeft',
    'arrowRight',
    'arrowUp',
    'backSpace',
    'delete',
    'end',
    'enter',
    'escape',
    'home',
    'pageUp',
    'pageDown',
    'space',
    'tab',
    'ctrlc',
  ],
  defaultProjectConfig: {
    version: 1,
    deployAliases: {},
  },
  syncStatusGraphQlResponse: {
    data: {
      syncStatus: 'SYNCED',
    },
  },
  nonceFetchingGraphQlResponse: {
    data: {
      account: {
        nonce: '999',
      },
    },
  },
  getAccountDetailsFetchingGraphQlResponse: (publicKey: string) => {
    return {
      data: {
        account: {
          publicKey,
          token: 'wSHV2S4qX9jFsLjQo8r1BsMLH2ZRKsZx6EJd1sbozGPieEC4Jf',
          nonce: '999',
          balance: { total: '0' },
          tokenSymbol: '',
          receiptChainHash:
            '2mza1ghsouqXbp8Rt9EEQwcUZkpFmhoQbMmGzqdRRjzSm1afZuYV',
          timing: {
            initialMinimumBalance: null,
            cliffTime: null,
            cliffAmount: null,
            vestingPeriod: null,
            vestingIncrement: null,
          },
          permissions: {
            editState: 'Proof',
            access: 'None',
            send: 'Proof',
            receive: 'None',
            setDelegate: 'Signature',
            setPermissions: 'Signature',
            setVerificationKey: 'Signature',
            setZkappUri: 'Signature',
            editActionState: 'Proof',
            setTokenSymbol: 'Signature',
            incrementNonce: 'Signature',
            setVotingFor: 'Signature',
            setTiming: 'Signature',
          },
          delegateAccount: {
            publicKey,
          },
          votingFor: '2mzWc7ZF8hRKvLyoLpKLZ3TSm8XSjfxZq67dphJpnjhYmU5Vja5Q',
          zkappState: ['2', '0', '0', '0', '0', '0', '0', '0'],
          verificationKey: {
            verificationKey: 'mockedVerificationKey',
            hash: '23113964601705267640721828504735879594037921437708937961472943945603864832180',
          },
          actionState: [
            '25079927036070901246064867767436987657692091363973573142121686150614948079097',
            '25079927036070901246064867767436987657692091363973573142121686150614948079097',
            '25079927036070901246064867767436987657692091363973573142121686150614948079097',
            '25079927036070901246064867767436987657692091363973573142121686150614948079097',
            '25079927036070901246064867767436987657692091363973573142121686150614948079097',
          ],
          provedState: false,
          zkappUri: '',
        },
      },
    };
  },
  zkAppTransactionGraphQlResponse: {
    data: {
      sendZkapp: {
        zkapp: {
          id: '1234567890',
          hash: '5Ju6e5WfkVhdp1PAVhAJoLxqgWZT17FVkFaTnU6XvPkGwUHdDvqC',
          failureReason: null,
        },
      },
    },
  },
  mempoolGraphQlResponse: {
    data: { pooledUserCommands: [], pooledZkappCommands: [] },
  },
  accounts: [
    {
      pk: 'B62qq1miZzh8QMumJ2dhJSvPxdeShGQ2G2cH4YXwxNLpPSvKdRVTb3q',
      sk: 'EKEnVLUhYHDJvgmgQu5SzaV8MWKNfhAXYSkLBRk5KEfudWZRbs4P',
    },
    {
      pk: 'B62qq6f3enRpmGsWBaJMstwQjQiRdAnyAZ6CbKrcJFgFidRnWZyJkje',
      sk: 'EKEXS3qUZRhxDzExtuAaQVHtxLzt8A3fqS7o7iL9NpvdATsshvB6',
    },
    {
      pk: 'B62qkBw74e5D3yZLAFTCK3yktG4TZtq4wSfjPrxKr9Psxu29oEZWpvw',
      sk: 'EKF3qRhoze6r6bgF5uRmhMkEahfZJHHQ3hzxqCbPvaNzdhxMVCQh',
    },
    {
      pk: 'B62qrDMuC4Vu3x6Kcr6YpBYsFsrshpyyH6MWX4cs5UNN2b9syT3rHNX',
      sk: 'EKFd1GxnQ53H3shreTB2VzQJxECz9DE9NjorrkfKyEuKCsHDHVSE',
    },
    {
      pk: 'B62qo2C5mvFGtmTdHVAynh2ZgD3kG6QbN6pMqnoCYsaFyCsxHuskFVe',
      sk: 'EKFTtvEvxDbMLGfmktofYT1Art7imjTQjUctvpuzbD5bzm9PxHrG',
    },
    {
      pk: 'B62qmYHbjp4oDCNRNgHf1YLPQWQkVZ49Q6DLXmA9UdoERa9q29piAAo',
      sk: 'EKEHLiY4THpcrHaKNqj9yPCCS9gBFCF5P2ZQSULeAyjUZRyDXV2Z',
    },
    {
      pk: 'B62qiYg67MzbxgsHv9EPxANUk9EyKWLdPFVc6sdvECF2ktZoguHRRbg',
      sk: 'EKDpKJFP7UYUgFDxDQX8mprMtoFJHorK8dQfT6c1RmyCJLVDgFnB',
    },
    {
      pk: 'B62qmKLqCjz7j4Wj1yodmsr9xDtGaiMz538NMY39D9dpukZJtEmsSFr',
      sk: 'EKEKGDyC13jpwTacYGbpr6nvhaifmMss5cEuYXYHyxYCoD656Cff',
    },
    {
      pk: 'B62qoY1SU63CQR2kyU3ra38s9AD66hyLsxRx91gkpEm3Y9sUcer5x5k',
      sk: 'EKFT7AEhreTdud8prVgfvrGnXd8W45mVftwSPmm4o4okQDLN9Eei',
    },
    {
      pk: 'B62qkEdNmGbUVaUnVtwMeMo9G1QBgfp9c3K7j4FbmXn21zG8ssvaPvi',
      sk: 'EKEJru1CaxwBKMZZzoKEpD1HPCF77htS2VgqoVz6dBaCRoTtmFCy',
    },
  ],
  getMempoolTxnsQuery: `{
    pooledUserCommands {
      hash
      failureReason
    }
    pooledZkappCommands {
      hash
      failureReason {
        failures
        index
      }
    }
  }`,
  getAccountDetailsQuery: (publicKey: string) => {
    return `{
      account(publicKey: "${publicKey}") {
        publicKey
        nonce
        balance {
          total
        }
        zkappState
        verificationKey {
          verificationKey
        }
      }
    }`;
  },
  getRecentBlocksQuery: (maxLength = TestConstants.recentBlocks) => {
    return `{
      bestChain(maxLength: ${maxLength}) {
        stateHash
        commandTransactionCount
        transactions {
          userCommands {
            hash
            failureReason
          }
          zkappCommands {
            hash
            failureReason {
              failures
              index
            }
          }
        }
      }
    }`;
  },
});

export function generateRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function getBooleanFromString(target?: string): boolean {
  return target?.trim() === 'true';
}

export function getArrayValuesAsString(
  array: string[] | readonly string[]
): string {
  return JSON.stringify(array)
    .replaceAll(',', ', ')
    .replace(/[[|\]]/g, '');
}

export function isEmptyDir(path: string): boolean {
  try {
    const directory = fs.opendirSync(path);
    const entry = directory.readSync();
    directory.closeSync();

    return entry === null;
  } catch (error) {
    return false;
  }
}

export function feePayerCacheExists(): boolean {
  return (
    fs.existsSync(Constants.feePayerCacheDir) &&
    !isEmptyDir(Constants.feePayerCacheDir)
  );
}

export function listCachedFeePayerAliases(): string[] {
  if (feePayerCacheExists()) {
    let aliases = fs.readdirSync(Constants.feePayerCacheDir);

    aliases = aliases
      .filter((fileName) => fileName.endsWith('.json'))
      .map((name) => name.slice(0, -5));

    return aliases;
  } else {
    return [];
  }
}

export function cleanupFeePayerCache(): void {
  if (feePayerCacheExists()) {
    console.info(
      `Cleaning up the fee payer cache directory: ${Constants.feePayerCacheDir}`
    );
    fs.rmSync(TestConstants.feePayerTmpCacheDir, {
      force: true,
      recursive: true,
    });
    fs.renameSync(
      Constants.feePayerCacheDir,
      TestConstants.feePayerTmpCacheDir
    );
  }
}

export function cleanupFeePayerCacheByAlias(alias: string): void {
  console.info(`Cleaning up the fee payer cache for alias: ${alias}`);
  fs.rmSync(
    `${Constants.feePayerCacheDir}/${alias.trim().replace(/\s+/g, '-')}.json`,
    { force: true }
  );
}

export function restoreFeePayerCache(): void {
  if (
    fs.existsSync(TestConstants.feePayerTmpCacheDir) &&
    !isEmptyDir(TestConstants.feePayerTmpCacheDir)
  ) {
    fs.rmSync(Constants.feePayerCacheDir, { force: true, recursive: true });
    fs.renameSync(
      TestConstants.feePayerTmpCacheDir,
      Constants.feePayerCacheDir
    );
  }
}

export function getZkAppAccountFromAlias(
  workDir: string,
  deploymentAlias: string
): KeyPair {
  const sanitizedDeploymentAlias = deploymentAlias.trim().replace(/\s+/g, '-');
  const zkAppKeyPath = JSON.parse(
    fs.readFileSync(`${workDir}/config.json`, 'utf8')
  ).deployAliases[sanitizedDeploymentAlias].keyPath as string;
  const zkAppAccount = JSON.parse(
    fs.readFileSync(`${workDir}/${zkAppKeyPath}`, 'utf8')
  ) as KeyPair;

  return zkAppAccount;
}

export function getZkAppSmartContractNameFromAlias(
  workDir: string,
  deploymentAlias: string
): string {
  const sanitizedDeploymentAlias = deploymentAlias.trim().replace(/\s+/g, '-');
  const smartContract = JSON.parse(
    fs.readFileSync(`${workDir}/config.json`, 'utf8')
  ).deployAliases[sanitizedDeploymentAlias].smartContract as string;

  return smartContract;
}

export async function checkSmartContractsFilesystem(
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

// We need to filter out the node ESM loader from NODE_OPTIONS for CLI tests.
// Otherwise, `zkapp-cli` will also consume the loader and fail.
//   https://github.com/microsoft/playwright/issues/24516
export async function removeEnvCustomLoaders(): Promise<void> {
  if (process.env.NODE_OPTIONS) {
    process.env.NODE_OPTIONS = process.env.NODE_OPTIONS.replace(
      /--experimental-loader=[^\s]+/g,
      ''
    );
  }
}
