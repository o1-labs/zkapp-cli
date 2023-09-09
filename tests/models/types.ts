import { ExitCode } from '@shimkiv/cli-testing-library/lib/createExecute';
import { CLITestEnvironment } from '@shimkiv/cli-testing-library/lib/types';
import CommonConstants from '../../src/lib/constants.js';

export type FailureReason = {
  index: number;
  failures: string[];
};

export type Transaction = {
  id?: string;
  hash: string;
  failureReason: string | FailureReason[] | null;
};

export type Mempool = {
  pooledUserCommands: Transaction[];
  pooledZkappCommands: Transaction[];
};

export type KeyPair = {
  publicKey: string;
  privateKey: string;
};

export type Account = {
  pk: string;
  sk: string;
  used?: boolean;
};

export type AccountDetails = {
  publicKey: string;
  token: string;
  nonce: string;
  balance: { total: string };
  tokenSymbol: string | null;
  receiptChainHash: string | null;
  timing: {
    initialMinimumBalance: string | null;
    cliffTime: string | null;
    cliffAmount: string | null;
    vestingPeriod: string | null;
    vestingIncrement: string | null;
  };
  permissions: {
    editState: string;
    access: string;
    send: string;
    receive: string;
    setDelegate: string;
    setPermissions: string;
    setVerificationKey: string;
    setZkappUri: string;
    editActionState: string;
    setTokenSymbol: string;
    incrementNonce: string;
    setVotingFor: string;
    setTiming: string;
  } | null;
  delegateAccount: { publicKey: string } | null;
  votingFor: string | null;
  zkappState: string[] | null;
  verificationKey: { verificationKey: string; hash: string } | null;
  actionState: string[] | null;
  provedState: boolean | null;
  zkappUri: string | null;
};

export type Block = {
  stateHash: string;
  commandTransactionCount: number;
  transactions: {
    userCommands: Transaction[];
    zkappCommands: Transaction[];
  };
};

export type Constants = {
  cliPromptMsDelay: number;
  minaGraphQlPort: number;
  minaAccountsManagerPort: number;
  mockedEndpointsServicePort: number;
  skipInteractiveSelectionOptions: boolean[];
  feePayerMgmtTypes: string[];
  feePayerTmpCacheDir: string;
  recentBlocks: number;
  specialCliKeys: string[];
  defaultProjectConfig: {
    version: number;
    deployAliases: {};
  };
  syncStatusGraphQlResponse: {
    data: {
      syncStatus: string;
    };
  };
  nonceFetchingGraphQlResponse: {
    data: {
      account: {
        nonce: string;
      };
    };
  };
  // eslint-disable-next-line no-unused-vars
  getAccountDetailsFetchingGraphQlResponse: (publicKey: string) => {
    data: {
      account: AccountDetails;
    };
  };
  zkAppTransactionGraphQlResponse: {
    data: {
      sendZkapp: {
        zkapp: Transaction;
      };
    };
  };
  mempoolGraphQlResponse: {
    data: {
      pooledUserCommands: any[];
      pooledZkappCommands: any[];
    };
  };
  accounts: Account[];
  getMempoolTxnsQuery: string;
  getAccountDetailsQuery: (publicKey: string) => string; // eslint-disable-line no-unused-vars
  getRecentBlocksQuery: (maxLength?: number) => string; // eslint-disable-line no-unused-vars
};

export type CommandOptions = {
  processHandler: CLITestEnvironment['spawn'];
  runner: string;
  command: string;
  runFrom: string | undefined;
  waitForCompletion: boolean;
  interactiveDialog: any;
};

export type ConfigOptions = {
  processHandler: CLITestEnvironment['spawn'];
  deploymentAlias: string;
  feePayerAlias: string;
  feePayerAccount: Account;
  feePayerMgmtType: string;
  minaGraphQlEndpoint: string;
  transactionFee: string;
  interruptProcess: boolean;
  runFrom: string | undefined;
  waitForCompletion: boolean;
};

export type CommandResults = {
  exitCode: ExitCode | null;
  stdOut: string[];
  stdErr: string[];
  zkAppPublicKey?: string;
};

export type ZkConfigCommandResults = {
  workDir: string;
  deploymentAlias: string;
  feePayerAlias: string;
  feePayerAccount: Account;
  feePayerMgmtType: string;
  minaGraphQlEndpoint: string;
  transactionFee: string;
  stdOut: string[];
  exitCode: ExitCode | null;
};

export type UiType = (typeof CommonConstants.uiTypes)[number];
export type ExampleType = (typeof CommonConstants.exampleTypes)[number];
