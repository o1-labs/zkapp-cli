import { expect } from '@playwright/test';
import fs from 'node:fs';
import Constants from '../../src/lib/constants.js';
import {
  CommandOptions,
  CommandResults,
  ConfigOptions,
  KeyPair,
  ZkConfigCommandResults,
} from '../models/types.js';
import {
  executeInteractiveCommand,
  generateInputsForOptionSelection,
} from './cli-utils.js';
import {
  feePayerCacheExists,
  listCachedFeePayerAliases,
} from './common-utils.js';

export async function zkConfig(
  options: ConfigOptions
): Promise<CommandResults> {
  const command = 'config';
  const {
    processHandler,
    deploymentAlias,
    feePayerAlias,
    feePayerAccount,
    feePayerMgmtType,
    minaGraphQlEndpoint,
    transactionFee,
    interruptProcess,
    runFrom,
    waitForCompletion,
  } = options;
  let feePayerInteractiveDialog = {};

  if (feePayerCacheExists() && feePayerMgmtType !== 'cached') {
    feePayerInteractiveDialog = {
      ...feePayerInteractiveDialog,
      'Use stored account': ['arrowDown', 'enter'],
    };
  }

  switch (feePayerMgmtType) {
    case 'recover': {
      feePayerInteractiveDialog = {
        ...feePayerInteractiveDialog,
        'Recover fee payer account from an existing base58 private key': [
          'enter',
        ],
        'Create an alias for this account': [feePayerAlias, 'enter'],
        'Account private key (base58)': [
          feePayerAccount.sk,
          interruptProcess ? 'ctrlc' : 'enter',
        ],
      };
      break;
    }
    case 'new': {
      feePayerInteractiveDialog = {
        ...feePayerInteractiveDialog,
        'Recover fee payer account from an existing base58 private key': [
          'arrowDown',
          'enter',
        ],
        'Create an alias for this account': [
          feePayerAlias,
          interruptProcess ? 'ctrlc' : 'enter',
        ],
      };
      break;
    }
    case 'cached': {
      if (feePayerCacheExists()) {
        feePayerInteractiveDialog = {
          ...feePayerInteractiveDialog,
          'Use stored account': ['enter'],
        };
      }
      break;
    }
    default: {
      feePayerInteractiveDialog = {
        ...feePayerInteractiveDialog,
        'Recover fee payer account from an existing base58 private key': [
          'arrowDown',
          'arrowDown',
          'enter',
        ],
        'Choose another saved fee payer': generateInputsForOptionSelection(
          feePayerMgmtType,
          listCachedFeePayerAliases()
        ),
      };
      break;
    }
  }

  const interactiveDialog = {
    'Create a name (can be anything)': [deploymentAlias, 'enter'],
    'Set the Mina GraphQL API URL to deploy to': [minaGraphQlEndpoint, 'enter'],
    'Set transaction fee to use when deploying (in MINA)': [
      transactionFee,
      'enter',
    ],
    ...feePayerInteractiveDialog,
  };

  const { exitCode, stdOut, stdErr } = await executeInteractiveCommand({
    processHandler,
    runner: 'zk',
    command,
    runFrom,
    waitForCompletion,
    interactiveDialog,
  });

  console.info(`[Config CLI StdOut] zk ${command}: ${stdOut}`);
  console.info(`[Config CLI StdErr] zk ${command}: ${stdErr}`);

  return { exitCode, stdOut, stdErr };
}

export async function maybeZkConfig(
  options: CommandOptions
): Promise<CommandResults> {
  const { command } = options;
  const { exitCode, stdOut, stdErr } = await executeInteractiveCommand(options);

  console.info(`[Config CLI StdOut] zk ${command}: ${stdOut}`);
  console.info(`[Config CLI StdErr] zk ${command}: ${stdErr}`);

  return { exitCode, stdOut, stdErr };
}

export function checkZkConfig(options: ZkConfigCommandResults): void {
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
