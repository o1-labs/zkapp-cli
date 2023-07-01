export class Constants {
  static MINA_GRAPHQL_PORT = 8080;
  static MINA_MOCKED_GRAPHQL_PORT = 8282;

  static GRAPHQL_SYNC_STATUS_RESPONSE = {
    data: {
      syncStatus: 'SYNCED',
    },
  };
  static GRAPHQL_NONCE_FETCHING_RESPONSE = {
    data: {
      account: {
        nonce: '999',
      },
    },
  };
  static getGraphQlAccountDetailsFetchingResponse(publicKey) {
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
          zkappState: ['1', '0', '0', '0', '0', '0', '0', '0'],
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
  static GRAPHQL_TRANSACTION_RESPONSE = {
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
