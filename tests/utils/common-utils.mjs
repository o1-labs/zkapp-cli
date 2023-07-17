import fs from 'fs-extra';
import os from 'node:os';

export class Constants {
  static get cliPromptMsDelay() {
    return 500;
  }
  static get minaGraphQlPort() {
    return 8080;
  }
  static get minaAccountsManagerPort() {
    return 8181;
  }
  static get mockedEndpointsServicePort() {
    return 8282;
  }
  static get skipInteractiveSelectionOptions() {
    return [false, true];
  }
  static get uiTypes() {
    return ['next', 'svelte', 'nuxt', 'empty', 'none'];
  }
  static get exampleTypes() {
    return ['sudoku', 'tictactoe'];
  }
  static get feePayerMgmtTypes() {
    return ['recover', 'new', 'cached'];
  }
  static get feePayerCacheDir() {
    return `${os.homedir()}/.cache/zkapp-cli/keys`;
  }
  static get feePayerTmpCacheDir() {
    return `${os.homedir()}/.cache/zkapp-cli/_keys`;
  }
  static get specialCliKeys() {
    return [
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
    ];
  }
  static get defaultProjectConfig() {
    return {
      version: 1,
      deployAliases: {},
    };
  }
  static get syncStatusGraphQlResponse() {
    return {
      data: {
        syncStatus: 'SYNCED',
      },
    };
  }
  static get nonceFetchingGraphQlResponse() {
    return {
      data: {
        account: {
          nonce: '999',
        },
      },
    };
  }
  static getAccountDetailsFetchingGraphQlResponse(publicKey) {
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
            verificationKey:
              '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',
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
  }
  static get zkAppTransactionGraphQlResponse() {
    return {
      data: {
        sendZkapp: {
          zkapp: {
            id: '1234567890',
            hash: '5Ju6e5WfkVhdp1PAVhAJoLxqgWZT17FVkFaTnU6XvPkGwUHdDvqC',
            failureReason: null,
          },
        },
      },
    };
  }
  static get accounts() {
    return [
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
    ];
  }
}

export function generateRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function getBooleanFromString(string) {
  return string != null && string != undefined && string.trim() === 'true';
}

export function getArrayValuesAsString(array) {
  return JSON.stringify(array)
    .replaceAll(',', ', ')
    .replace(/[\[|\]]/g, '');
}

export function isEmptyDir(path) {
  try {
    const directory = fs.opendirSync(path);
    const entry = directory.readSync();
    directory.closeSync();

    return entry === null;
  } catch (error) {
    return false;
  }
}

export function feePayerCacheExists() {
  return (
    fs.existsSync(Constants.feePayerCacheDir) &&
    !isEmptyDir(Constants.feePayerCacheDir)
  );
}

export function listCachedFeePayerAliases() {
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

export function cleanupFeePayerCache() {
  if (feePayerCacheExists()) {
    fs.rmSync(Constants.feePayerTmpCacheDir, { force: true, recursive: true });
    fs.renameSync(Constants.feePayerCacheDir, Constants.feePayerTmpCacheDir);
  }
}

export function cleanupFeePayerCacheByAlias(alias) {
  fs.rmSync(
    `${Constants.feePayerCacheDir}/${alias
      .trim()
      .replace(/\s{1,}/g, '-')}.json`,
    { force: true }
  );
}

export function restoreFeePayerCache() {
  if (
    fs.existsSync(Constants.feePayerTmpCacheDir) &&
    !isEmptyDir(Constants.feePayerTmpCacheDir)
  ) {
    fs.rmSync(Constants.feePayerCacheDir, { force: true, recursive: true });
    fs.renameSync(Constants.feePayerTmpCacheDir, Constants.feePayerCacheDir);
  }
}
