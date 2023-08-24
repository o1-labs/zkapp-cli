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
  getAccountDetailsFetchingGraphQlResponse: (publicKey: string) => {
    data: {
      account: {
        publicKey: string;
        nonce: string;
        balance: {
          total: string;
        };
        delegateAccount: {
          publicKey: string;
        };
        zkappState: string[];
        verificationKey: {
          verificationKey: string;
          hash: string;
        };
      };
    };
  };
  zkAppTransactionGraphQlResponse: {
    data: {
      sendZkapp: {
        zkapp: {
          id: string;
          hash: string;
          failureReason: any;
        };
      };
    };
  };
  mempoolGraphQlResponse: {
    data: {
      pooledUserCommands: any[];
      pooledZkappCommands: any[];
    };
  };
  accounts: {
    pk: string;
    sk: string;
  }[];
  getMempoolTxnsQuery: string;
  getAccountDetailsQuery: (publicKey: string) => string;
  getRecentBlocksQuery: (maxLength?: number) => string;
};
