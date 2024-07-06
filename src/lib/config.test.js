import { jest } from '@jest/globals';

jest.unstable_mockModule('chalk', () => ({
  default: {
    blue: jest.fn((text) => `blue: ${text}`),
    yellow: jest.fn((text) => `yellow: ${text}`),
    green: jest.fn((text) => `green: ${text}`),
    red: jest.fn((text) => `red: ${text}`),
    gray: jest.fn((text) => `gray: ${text}`),
    bold: jest.fn((text) => `bold: ${text}`),
  },
}));

jest.unstable_mockModule('enquirer', () => ({
  default: {
    prompt: jest.fn(),
  },
}));

jest.unstable_mockModule('find-npm-prefix', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('fs-extra', () => ({
  default: {
    existsSync: jest.fn(),
    outputJsonSync: jest.fn(),
    readJsonSync: jest.fn(),
    readdirSync: jest.fn(),
    copySync: jest.fn(),
  },
}));

jest.unstable_mockModule('node:fs', () => ({
  default: {
    readFileSync: jest.fn(),
  },
}));

jest.unstable_mockModule('node:fs', () => ({
  default: {
    readFileSync: jest.fn(),
  },
}));

jest.unstable_mockModule('o1js', () => ({
  Lightnet: {
    acquireKeyPair: jest.fn(),
  },
  Mina: {
    Network: jest.fn(),
    setActiveInstance: jest.fn(),
  },
  PrivateKey: {
    fromBase58: jest.fn(),
  },
  PublicKey: {
    toBase58: jest.fn(),
  },
}));

jest.unstable_mockModule('table', () => ({
  getBorderCharacters: jest.fn(() => 'border-characters'),
  table: jest.fn(
    (data, config) => `table: ${JSON.stringify(data)} ${JSON.stringify(config)}`
  ),
}));

jest.unstable_mockModule('ora', () => ({
  default: () => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn(),
    fail: jest.fn(),
  }),
}));

jest.unstable_mockModule('mina-signer', () => ({
  default: class {
    constructor() {}
    genKeys = jest
      .fn()
      .mockReturnValue({ publicKey: 'publicKey', privateKey: 'privateKey' });
  },
}));

let fs,
  enquirer,
  findPrefix,
  Lightnet,
  PrivateKey,
  PublicKey,
  Constants,
  nodeFs,
  table;

beforeAll(async () => {
  const o1js = await import('o1js');
  fs = (await import('fs-extra')).default;
  nodeFs = (await import('node:fs')).default;
  enquirer = (await import('enquirer')).default;
  findPrefix = (await import('find-npm-prefix')).default;
  Lightnet = o1js.Lightnet;
  PrivateKey = o1js.PrivateKey;
  PublicKey = o1js.PublicKey;
  Constants = (await import('./constants.js')).default;
  table = (await import('table')).table;
});

beforeEach(() => {
  jest.clearAllMocks();
  global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    assert: jest.fn(),
  };
  jest.spyOn(process, 'exit').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('config.js', () => {
  describe('config()', () => {
    it('should warn if no deploy aliases available during listing', async () => {
      findPrefix.mockResolvedValue('/project/root');
      nodeFs.readFileSync.mockReturnValue('{ "deployAliases": {} }');
      const { default: config } = await import('./config.js');

      await config({ list: true });

      expect(table).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('None found')
      );
    });

    it('should list deploy aliases', async () => {
      findPrefix.mockResolvedValue('/project/root');
      nodeFs.readFileSync.mockReturnValue(
        '{ "deployAliases": { "testAlias1": { "url": "https://zkapp1.xyz", "smartContract": "Add" }, "testAlias2": {} } }'
      );
      const { default: config } = await import('./config.js');

      await config({ list: true });

      expect(table).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)testAlias1((.|\n)*)zkapp1\.xyz((.|\n)*)Add((.|\n)*)testAlias2((.|\n)*)\(never deployed\)((.|\n)*)/gi
        )
      );
    });

    it('should create the lightnet deploy alias (fee payer key pair creation)', async () => {
      jest.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({
          ok: true,
        })
      );
      nodeFs.readFileSync.mockReturnValue(
        '{ "deployAliases": { "testAlias1": { "url": "https://zkapp1.xyz", "smartContract": "Add" } } }'
      );
      findPrefix.mockResolvedValue('/project/root');
      jest.spyOn(Lightnet, 'acquireKeyPair').mockResolvedValue({
        publicKey: { toBase58: jest.fn().mockReturnValue('publicKey') },
        privateKey: { toBase58: jest.fn().mockReturnValue('privateKey') },
      });
      fs.existsSync.mockReturnValue(false);
      const { default: config } = await import('./config.js');

      await config({ lightnet: true });

      checkDeployAliasesFsCalls({
        fsCalls: fs.outputJsonSync.mock.calls,
        deployAliasName: 'lightnet1',
        deployAliasesConfig: {
          deployAliases: {
            testAlias1: {
              url: 'https://zkapp1.xyz',
              smartContract: 'Add',
            },
            lightnet1: {
              networkId: 'testnet',
              url: Constants.lightnetMinaDaemonGraphQlEndpoint,
              keyPath: 'keys/lightnet1.json',
              feepayerKeyPath: `${Constants.feePayerCacheDir}/lightnet1.json`,
              feepayerAlias: 'lightnet1',
              fee: '0.01',
            },
          },
        },
        feePayerKeyPairName: 'lightnet1',
        checkFeePayerKeys: true,
      });
      checkSuccessfulDeployAliasCreation(true);
    });

    it('should create the lightnet deploy alias (no fee payer key pair creation)', async () => {
      jest.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({
          ok: true,
        })
      );
      nodeFs.readFileSync.mockReturnValue(
        '{ "deployAliases": { "testAlias1": { "url": "https://zkapp1.xyz", "smartContract": "Add" } } }'
      );
      findPrefix.mockResolvedValue('/project/root');
      fs.existsSync.mockReturnValue(true);
      const { default: config } = await import('./config.js');

      await config({ lightnet: true });

      checkDeployAliasesFsCalls({
        fsCalls: fs.outputJsonSync.mock.calls,
        deployAliasName: 'lightnet1',
        deployAliasesConfig: {
          deployAliases: {
            testAlias1: {
              url: 'https://zkapp1.xyz',
              smartContract: 'Add',
            },
            lightnet1: {
              networkId: 'testnet',
              url: Constants.lightnetMinaDaemonGraphQlEndpoint,
              keyPath: 'keys/lightnet1.json',
              feepayerKeyPath: `${Constants.feePayerCacheDir}/lightnet1.json`,
              feepayerAlias: 'lightnet1',
              fee: '0.01',
            },
          },
        },
        checkFeePayerKeys: false,
      });
      checkSuccessfulDeployAliasCreation(true);
    });

    it('should create the lightnet deploy alias (not default deploy alias)', async () => {
      jest.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({
          ok: true,
        })
      );
      nodeFs.readFileSync.mockReturnValue(
        '{ "deployAliases": { "lightnet1": { "url": "https://zkapp1.xyz", "smartContract": "Add" } } }'
      );
      findPrefix.mockResolvedValue('/project/root');
      jest.spyOn(Lightnet, 'acquireKeyPair').mockResolvedValue({
        publicKey: { toBase58: jest.fn().mockReturnValue('publicKey') },
        privateKey: { toBase58: jest.fn().mockReturnValue('privateKey') },
      });
      fs.existsSync.mockReturnValue(false);
      const { default: config } = await import('./config.js');

      await config({ lightnet: true });

      checkDeployAliasesFsCalls({
        fsCalls: fs.outputJsonSync.mock.calls,
        deployAliasName: 'lightnet2',
        deployAliasesConfig: {
          deployAliases: {
            lightnet1: {
              url: 'https://zkapp1.xyz',
              smartContract: 'Add',
            },
            lightnet2: {
              networkId: 'testnet',
              url: Constants.lightnetMinaDaemonGraphQlEndpoint,
              keyPath: 'keys/lightnet2.json',
              feepayerKeyPath: `${Constants.feePayerCacheDir}/lightnet2.json`,
              feepayerAlias: 'lightnet2',
              fee: '0.01',
            },
          },
        },
        feePayerKeyPairName: 'lightnet2',
        checkFeePayerKeys: true,
      });
      checkSuccessfulDeployAliasCreation(true);
    });

    it('should not create the lightnet deploy alias', async () => {
      jest.spyOn(global, 'fetch').mockImplementation(() => {
        throw new Error('Network error');
      });
      nodeFs.readFileSync.mockReturnValue(
        '{ "deployAliases": { "testAlias1": { "url": "https://zkapp1.xyz", "smartContract": "Add" } } }'
      );
      findPrefix.mockResolvedValue('/project/root');
      const { default: config } = await import('./config.js');

      await config({ lightnet: true });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(
          `Mina GraphQL endpoint ${Constants.lightnetMinaDaemonGraphQlEndpoint} is not available`
        )
      );
    });

    it('should create the deploy alias (no fee payer cache, create one)', async () => {
      findPrefix.mockResolvedValue('/project/root');
      nodeFs.readFileSync.mockReturnValue('{ "deployAliases": {} }');
      fs.readdirSync.mockReturnValue([]);
      enquirer.prompt.mockImplementation(async () => ({
        deployAliasName: 'testAlias1',
        networkId: 'testnet',
        url: 'https://zkapp1.xyz',
        fee: '0.01',
        feepayer: 'create',
        feepayerAlias: 'feePayerTestAlias1',
      }));
      const { default: config } = await import('./config.js');

      await config({});

      checkDeployAliasesCommonPrompts();
      checkSuccessfulDeployAliasCreation();
    });

    it('should create the deploy alias (no fee payer cache, recover one)', async () => {
      findPrefix.mockResolvedValue('/project/root');
      nodeFs.readFileSync.mockReturnValue('{ "deployAliases": {} }');
      fs.readdirSync.mockReturnValue([]);
      enquirer.prompt.mockImplementation(async () => ({
        deployAliasName: 'testAlias1',
        networkId: 'testnet',
        url: 'https://zkapp1.xyz',
        fee: '0.01',
        feepayer: 'recover',
        feepayerAlias: 'feePayerTestAlias1',
        feepayerKey: 'feePayerPrivateKey',
      }));
      PrivateKey.fromBase58.mockReturnValue({ toPublicKey: () => 'publicKey' });
      PublicKey.toBase58.mockReturnValue('publicKey');
      const { default: config } = await import('./config.js');

      await config({});

      checkDeployAliasesCommonPrompts();
      checkSuccessfulDeployAliasCreation();
    });

    it('should create the deploy alias (with default fee payer cache)', async () => {
      findPrefix.mockResolvedValue('/project/root');
      nodeFs.readFileSync.mockReturnValue('{ "deployAliases": {} }');
      fs.readdirSync.mockReturnValue(['testAlias1.json']);
      fs.readJsonSync.mockImplementation((path) => {
        if (path.endsWith('.json')) {
          return {
            publicKey: 'publicKey',
            privateKey: 'privateKey',
          };
        }
        return {};
      });
      enquirer.prompt
        .mockResolvedValueOnce({
          deployAliasName: 'testAlias1',
          networkId: 'testnet',
          url: 'https://zkapp1.xyz',
          fee: '0.01',
          feepayer: 'other',
        })
        .mockResolvedValueOnce({
          feepayer: 'defaultCache',
          feepayerAlias: 'testAlias1',
        });
      PrivateKey.fromBase58.mockReturnValue({ toPublicKey: () => 'publicKey' });
      PublicKey.toBase58.mockReturnValue('publicKey');
      const { default: config } = await import('./config.js');

      await config({});

      checkSuccessfulDeployAliasCreation();
    });

    it('should create the deploy alias (with another fee payer cache)', async () => {
      findPrefix.mockResolvedValue('/project/root');
      nodeFs.readFileSync.mockReturnValue('{ "deployAliases": {} }');
      fs.readdirSync.mockReturnValue(['testAlias1.json', 'testAlias2.json']);
      fs.readJsonSync.mockImplementation((path) => {
        if (path.endsWith('.json')) {
          return {
            publicKey: 'publicKey',
            privateKey: 'privateKey',
          };
        }
        return {};
      });
      enquirer.prompt
        .mockResolvedValueOnce({
          deployAliasName: 'testAlias1',
          networkId: 'testnet',
          url: 'https://zkapp1.xyz',
          fee: '0.01',
          feepayer: 'other',
        })
        .mockResolvedValueOnce({
          feepayer: 'alternateCachedFeepayer',
          feepayerAlias: 'testAlias2',
        });
      PrivateKey.fromBase58.mockReturnValue({ toPublicKey: () => 'publicKey' });
      PublicKey.toBase58.mockReturnValue('publicKey');
      const { default: config } = await import('./config.js');

      await config({});

      checkSuccessfulDeployAliasCreation();
    });

    it('should create the deploy alias (with other fee payer cache option, recover one)', async () => {
      findPrefix.mockResolvedValue('/project/root');
      nodeFs.readFileSync.mockReturnValue('{ "deployAliases": {} }');
      fs.readdirSync.mockReturnValue(['testAlias1.json']);
      fs.readJsonSync.mockImplementation((path) => {
        if (path.endsWith('.json')) {
          return {
            publicKey: 'publicKey',
            privateKey: 'privateKey',
          };
        }
        return {};
      });
      enquirer.prompt
        .mockResolvedValueOnce({
          deployAliasName: 'testAlias1',
          networkId: 'testnet',
          url: 'https://zkapp1.xyz',
          fee: '0.01',
          feepayer: 'other',
        })
        .mockResolvedValueOnce({
          feepayer: 'recover',
          feepayerAlias: 'testAlias2',
        });
      PrivateKey.fromBase58.mockReturnValue({ toPublicKey: () => 'publicKey' });
      PublicKey.toBase58.mockReturnValue('publicKey');
      const { default: config } = await import('./config.js');

      await config({});

      checkSuccessfulDeployAliasCreation();
    });

    it('should create the deploy alias (with other fee payer cache option, create one)', async () => {
      findPrefix.mockResolvedValue('/project/root');
      nodeFs.readFileSync.mockReturnValue('{ "deployAliases": {} }');
      fs.readdirSync.mockReturnValue(['testAlias1.json']);
      fs.readJsonSync.mockImplementation((path) => {
        if (path.endsWith('.json')) {
          return {
            publicKey: 'publicKey',
            privateKey: 'privateKey',
          };
        }
        return {};
      });
      enquirer.prompt
        .mockResolvedValueOnce({
          deployAliasName: 'testAlias1',
          networkId: 'testnet',
          url: 'https://zkapp1.xyz',
          fee: '0.01',
          feepayer: 'other',
        })
        .mockResolvedValueOnce({
          feepayer: 'create',
          feepayerAlias: 'testAlias2',
        });
      PrivateKey.fromBase58.mockReturnValue({ toPublicKey: () => 'publicKey' });
      PublicKey.toBase58.mockReturnValue('publicKey');
      const { default: config } = await import('./config.js');

      await config({});

      checkSuccessfulDeployAliasCreation();
    });

    it('should create the deploy alias (ENOENT while reading fee payer cache)', async () => {
      findPrefix.mockResolvedValue('/project/root');
      nodeFs.readFileSync.mockReturnValue('{ "deployAliases": {} }');
      fs.readdirSync.mockImplementation(() => {
        const error = new Error();
        error.code = 'ENOENT';
        throw error;
      });
      enquirer.prompt.mockImplementation(async () => ({
        deployAliasName: 'testAlias1',
        networkId: 'testnet',
        url: 'https://zkapp1.xyz',
        fee: '0.01',
        feepayer: 'create',
        feepayerAlias: 'feePayerTestAlias1',
      }));
      const { default: config } = await import('./config.js');

      await config({});

      checkDeployAliasesCommonPrompts(true);
      checkSuccessfulDeployAliasCreation();
    });

    it('should not create the deploy alias (exit if no fee payer choice made)', async () => {
      findPrefix.mockResolvedValue('/project/root');
      nodeFs.readFileSync.mockReturnValue('{ "deployAliases": {} }');
      fs.readdirSync.mockReturnValue([]);
      enquirer.prompt.mockImplementation(async () => ({
        deployAliasName: 'testAlias1',
        networkId: 'testnet',
        url: 'https://zkapp1.xyz',
        fee: '0.01',
        feepayerAlias: 'feePayerTestAlias1',
        feepayerKey: 'feePayerPrivateKey',
      }));
      const { default: config } = await import('./config.js');

      try {
        await config({});
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toContain(
          "Cannot read properties of undefined (reading 'publicKey')"
        );
      } finally {
        expect(process.exit).toHaveBeenCalledWith(1);
      }
    });

    it('should not create the deploy alias (exit if no deploy alias given)', async () => {
      findPrefix.mockResolvedValue('/project/root');
      nodeFs.readFileSync.mockReturnValue('{ "deployAliases": {} }');
      fs.readdirSync.mockReturnValue([]);
      enquirer.prompt.mockImplementation(async () => ({
        // deployAliasName: 'testAlias1',
        networkId: 'testnet',
        url: 'https://zkapp1.xyz',
        fee: '0.01',
        feepayer: 'create',
        feepayerAlias: 'feePayerTestAlias1',
      }));
      const { default: config } = await import('./config.js');

      await config({});

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should not create the deploy alias (exit if no url given)', async () => {
      jest.spyOn(global, 'URL').mockImplementation(() => {
        return {
          hostname: '',
        };
      });
      findPrefix.mockResolvedValue('/project/root');
      nodeFs.readFileSync.mockReturnValue('{ "deployAliases": {} }');
      fs.readdirSync.mockReturnValue([]);
      enquirer.prompt.mockImplementation(async () => ({
        deployAliasName: 'testAlias1',
        networkId: 'testnet',
        fee: '0.01',
        feepayer: 'create',
        feepayerAlias: 'feePayerTestAlias1',
      }));
      const { default: config } = await import('./config.js');

      await config({});

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should not create the deploy alias (exit if no fee given)', async () => {
      findPrefix.mockResolvedValue('/project/root');
      nodeFs.readFileSync.mockReturnValue('{ "deployAliases": {} }');
      fs.readdirSync.mockReturnValue([]);
      enquirer.prompt.mockImplementation(async () => ({
        deployAliasName: 'testAlias1',
        networkId: 'testnet',
        url: 'https://zkapp1.xyz',
        feepayer: 'create',
        feepayerAlias: 'feePayerTestAlias1',
      }));
      const { default: config } = await import('./config.js');

      await config({});

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should not create the deploy alias (exit if no fee payer alias given)', async () => {
      findPrefix.mockResolvedValue('/project/root');
      nodeFs.readFileSync.mockReturnValue('{ "deployAliases": {} }');
      fs.readdirSync.mockReturnValue([]);
      enquirer.prompt.mockImplementation(async () => ({
        deployAliasName: 'testAlias1',
        networkId: 'testnet',
        url: 'https://zkapp1.xyz',
        feepayer: 'create',
      }));
      const { default: config } = await import('./config.js');

      await config({});

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('createKeyPair()', () => {
    it('should create a key pair', async () => {
      const { createKeyPair } = await import('./config.js');

      const keyPair = createKeyPair('testnet');

      expect(keyPair).toEqual({
        publicKey: 'publicKey',
        privateKey: 'privateKey',
      });
    });
  });

  describe('getExplorerName()', () => {
    it('should get explorer name from GraphQL URL', async () => {
      const { getExplorerName } = await import('./config.js');

      const explorerName = getExplorerName('https://minascan.test.url');

      expect(explorerName).toEqual('minascan');
    });
  });

  describe('printInteractiveDeployAliasConfigSuccessMessage()', () => {
    it('should print interactive deploy alias config success message', async () => {
      const { printInteractiveDeployAliasConfigSuccessMessage } = await import(
        './config.js'
      );

      printInteractiveDeployAliasConfigSuccessMessage(
        {
          deployAliases: { testAlias1: { url: 'https://minascan.test.url' } },
        },
        'testAlias1',
        { publicKey: 'publicKey' }
      );

      checkSuccessfulDeployAliasCreation();
    });
  });

  describe('printLightnetDeployAliasConfigSuccessMessage()', () => {
    it('should print lightnet deploy alias config success message', async () => {
      const { printLightnetDeployAliasConfigSuccessMessage } = await import(
        './config.js'
      );

      printLightnetDeployAliasConfigSuccessMessage('lightnet1');

      checkSuccessfulDeployAliasCreation(true);
    });
  });
});

function checkDeployAliasesCommonPrompts(isFeePayerReadEnoentError = false) {
  if (!isFeePayerReadEnoentError) {
    // Should print error if cached fee payer key pair reading was thrown with error other than ENOENT
    expect(console.error).toHaveBeenCalled();
  } else {
    expect(console.error).not.toHaveBeenCalled();
  }
  expect(table).toHaveBeenCalled();
  expect(console.log).toHaveBeenCalledWith(
    'Enter values to create a deploy alias:'
  );
}

function checkDeployAliasesFsCalls({
  fsCalls,
  deployAliasName,
  deployAliasesConfig,
  feePayerKeyPairName,
  checkFeePayerKeys = true,
} = {}) {
  expect(findPrefix).toHaveBeenCalledWith(process.cwd());
  expect(nodeFs.readFileSync).toHaveBeenCalledWith(
    '/project/root/config.json',
    'utf8'
  );
  // Fee payer FS key pair creation check
  if (checkFeePayerKeys) {
    expect(fsCalls[0][0]).toBe(
      `${Constants.feePayerCacheDir}/${feePayerKeyPairName}.json`
    );
    expect(fsCalls[0][1]).toEqual({
      publicKey: 'publicKey',
      privateKey: 'privateKey',
    });
  }
  // zkApp FS key pair creation check
  expect(fsCalls[checkFeePayerKeys ? 1 : 0][0]).toBe(
    `/project/root/keys/${deployAliasName}.json`
  );
  expect(fsCalls[checkFeePayerKeys ? 1 : 0][1]).toEqual({
    publicKey: 'publicKey',
    privateKey: 'privateKey',
  });
  // Deploy aliases FS update check
  expect(fsCalls[checkFeePayerKeys ? 2 : 1][0]).toBe(
    `/project/root/config.json`
  );
  expect(fsCalls[checkFeePayerKeys ? 2 : 1][1]).toEqual(deployAliasesConfig);
}

function checkSuccessfulDeployAliasCreation(isLightnetInUse = false) {
  if (!isLightnetInUse) {
    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(
        /((.|\n)*)If this is the testnet, request tMINA at((.|\n)*)/gi
      )
    );
  }
  expect(console.log).toHaveBeenCalledWith(
    expect.stringMatching(
      /((.|\n)*)Success!((.|\n)*)To deploy zkApp, run((.|\n)*)/gi
    )
  );
}
