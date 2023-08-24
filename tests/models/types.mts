export type FailureReason = {
  index: number;
  failures: string[];
};

export type Transaction = {
  id?: string;
  hash: string;
  failureReason?: string | FailureReason[];
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
  nonce: string;
  balance: {
    total: string;
  };
  delegateAccount?: {
    publicKey: string;
  };
  zkappState?: string[];
  verificationKey?: {
    verificationKey: string;
  };
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
