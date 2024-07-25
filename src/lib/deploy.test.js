import { jest } from '@jest/globals';

jest.unstable_mockModule('chalk', () => ({
  default: {
    blue: jest.fn((text) => `blue: ${text}`),
    yellow: jest.fn((text) => `yellow: ${text}`),
    green: jest.fn((text) => `green: ${text}`),
    red: jest.fn((text) => `red: ${text}`),
    gray: jest.fn((text) => `gray: ${text}`),
    bold: jest.fn((text) => `bold: ${text}`),
    reset: jest.fn((text) => `reset: ${text}`),
  },
}));

jest.unstable_mockModule('enquirer', () => ({
  default: {
    prompt: jest.fn(),
  },
}));

jest.unstable_mockModule('fast-glob', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('find-npm-prefix', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('fs-extra', () => ({
  default: {
    existsSync: jest.fn(),
    mkdir: jest.fn(),
    readJsonSync: jest.fn(),
    writeJSONSync: jest.fn(),
    copySync: jest.fn(),
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(),
    emptyDirSync: jest.fn(),
    outputJsonSync: jest.fn(),
  },
}));

jest.unstable_mockModule('node:fs', () => ({
  default: {
    readFileSync: jest.fn(),
    readdirSync: jest.fn(),
    existsSync: jest.fn(),
  },
}));

jest.unstable_mockModule('node:child_process', () => ({
  execSync: jest.fn(),
}));

jest.unstable_mockModule('node:path', () => ({
  default: {
    basename: jest.fn(),
    isAbsolute: jest.fn(),
    includes: jest.fn(),
    join: jest.fn().mockImplementation((...args) => args.join('/')),
    resolve: jest.fn(),
    dirname: jest.fn(),
    sep: '/',
  },
}));

jest.unstable_mockModule('node:util', () => ({
  default: {
    format: jest.fn(),
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

jest.unstable_mockModule('./dynamic-import-helper.js', () => ({
  dynamicImport: jest.fn(),
}));

jest.unstable_mockModule('o1js', () => ({
  Mina: {
    Network: jest.fn(),
    setActiveInstance: jest.fn(),
  },
  PrivateKey: {
    fromBase58: jest.fn(),
  },
  AccountUpdate: {
    fundNewAccount: jest.fn(),
  },
}));

let fs, path, execSync, enquirer, glob, findPrefix, nodeFs, dynamicImport, Mina;

beforeAll(async () => {
  const o1js = await import('o1js');
  Mina = o1js.Mina;
  fs = (await import('fs-extra')).default;
  path = (await import('node:path')).default;
  execSync = (await import('node:child_process')).execSync;
  enquirer = (await import('enquirer')).default;
  glob = (await import('fast-glob')).default;
  findPrefix = (await import('find-npm-prefix')).default;
  nodeFs = (await import('node:fs')).default;
  dynamicImport = (await import('./dynamic-import-helper.js')).dynamicImport;
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

describe('deploy.js', () => {
  describe('deploy()', () => {
    it('should exit if zkapp-cli is not installed', async () => {
      await setupCommonMocks();
      nodeFs.readFileSync.mockReturnValue(
        JSON.stringify({ deployAliases: {} })
      );
      mockFetchVersion('0.0.0');
      execSync.mockImplementation(() => JSON.stringify({}));
      process.exit.mockImplementation(() => {
        throw new Error('process.exit');
      });
      const { default: deploy } = await import('./deploy.js');

      await expect(deploy({ alias: 'test-alias', yes: true })).rejects.toThrow(
        'process.exit'
      );

      expect(console.log).toHaveBeenCalledWith(
        'red: Failed to detect the installed zkapp-cli version. This might be possible if you are using Volta or something similar to manage your Node versions.'
      );
      expect(console.log).toHaveBeenCalledWith(
        'red: As a workaround, you can install zkapp-cli as a local dependency by running `npm install zkapp-cli`'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should exit if old zkapp-cli version is in use', async () => {
      await setupCommonMocks();
      nodeFs.readFileSync.mockReturnValue(
        JSON.stringify({ deployAliases: {} })
      );
      mockFetchVersion('0.1.0');
      execSync.mockReturnValueOnce(JSON.stringify({})).mockReturnValueOnce(
        JSON.stringify({
          dependencies: { 'zkapp-cli': { version: '0.0.0' } },
        })
      );
      process.exit.mockImplementation(() => {
        throw new Error('process.exit');
      });
      const { default: deploy } = await import('./deploy.js');

      await expect(deploy({ alias: 'test-alias', yes: true })).rejects.toThrow(
        'process.exit'
      );

      expect(console.log).toHaveBeenCalledWith(
        'red: You are using an earlier zkapp-cli version 0.0.0.'
      );
      expect(console.log).toHaveBeenCalledWith(
        'red: The current version is 0.1.0.'
      );
      expect(console.log).toHaveBeenCalledWith(
        'red: Run `npm update -g zkapp-cli && npm install o1js@latest`.'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should exit if no deploy aliases found during the prompt', async () => {
      await setupCommonMocks();
      nodeFs.readFileSync.mockReturnValue(
        JSON.stringify({ deployAliases: {} })
      );
      mockFetchVersion('0.0.0');
      execSync.mockReturnValueOnce(JSON.stringify({})).mockReturnValueOnce(
        JSON.stringify({
          dependencies: { 'zkapp-cli': { version: '0.0.0' } },
        })
      );
      process.exit.mockImplementation(() => {
        throw new Error('process.exit');
      });
      const { default: deploy } = await import('./deploy.js');

      await expect(deploy({ yes: true })).rejects.toThrow('process.exit');

      expect(console.log).toHaveBeenCalledWith(
        'red: No deploy aliases found in config.json.'
      );
      expect(console.log).toHaveBeenCalledWith(
        'red: Run `zk config` to add a deploy alias, then try again.'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should exit if no deploy aliases found after the prompt', async () => {
      await setupCommonMocks();
      nodeFs.readFileSync.mockReturnValue(
        JSON.stringify({
          deployAliases: {
            testalias1: {},
            testalias2: {},
          },
        })
      );
      mockFetchVersion('0.0.0');
      execSync.mockReturnValueOnce(JSON.stringify({})).mockReturnValueOnce(
        JSON.stringify({
          dependencies: { 'zkapp-cli': { version: '0.0.0' } },
        })
      );
      process.exit.mockImplementation(() => {
        throw new Error('process.exit');
      });
      const { default: deploy } = await import('./deploy.js');

      await expect(deploy({ alias: 'testAlias3', yes: true })).rejects.toThrow(
        'process.exit'
      );

      expect(console.log).toHaveBeenCalledWith(
        'red: Deploy alias name not found in config.json.'
      );
      expect(console.log).toHaveBeenCalledWith(
        'red: You can add a deploy alias by running `zk config`.'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should warn if no deploy alias URL found', async () => {
      setupDeploymentMocks({ provideAliasUrl: false });
      const { default: deploy } = await import('./deploy.js');

      await deploy({ alias: 'testAlias1', yes: true });

      expect(console.log).toHaveBeenCalledWith(
        "yellow: No 'url' property is specified for this deploy alias in config.json."
      );
      expect(console.log).toHaveBeenCalledWith(
        'yellow: The default (https://proxy.devnet.minaexplorer.com/graphql) one will be used instead.'
      );
      checkSuccessfulDeployment();
    });

    it('should prompt user for deploy alias if not provided', async () => {
      setupDeploymentMocks();
      const { default: deploy } = await import('./deploy.js');

      await deploy({ yes: true });

      expect(enquirer.prompt).toHaveBeenCalledWith({
        type: 'select',
        name: 'name',
        choices: Object.keys({
          testalias1: {},
          testalias2: {},
        }),
        message: expect.any(Function),
        prefix: expect.any(Function),
      });
      checkSuccessfulDeployment();
    });

    it('should convert backslashes to forward slashes on Windows platform', async () => {
      const originalPlatform = process.platform;
      try {
        Object.defineProperty(process, 'platform', {
          value: 'win32',
        });
        setupDeploymentMocks();
        const { default: deploy } = await import('./deploy.js');

        await deploy({ yes: true });

        checkSuccessfulDeployment();
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
        });
      }
    });

    it('should prompt for confirmation if not provided', async () => {
      setupDeploymentMocks();
      enquirer.prompt
        .mockResolvedValueOnce({
          name: 'testalias1',
        })
        .mockResolvedValueOnce({ confirm: 'y' });
      const { default: deploy } = await import('./deploy.js');

      await deploy({ yes: false });

      expect(enquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'input',
          name: 'confirm',
          message: expect.any(Function),
          prefix: expect.any(Function),
          result: expect.any(Function),
        })
      );
      checkSuccessfulDeployment();
    });

    it('should log cache error during the project build procedure', async () => {
      setupDeploymentMocks();
      fs.readJsonSync.mockImplementation(() => {
        throw new Error('readJsonSync');
      });
      console.error.mockImplementation(() => {
        throw new Error('readJsonSync');
      });
      const { default: deploy } = await import('./deploy.js');

      await expect(deploy({ alias: 'testalias1', yes: false })).rejects.toThrow(
        'readJsonSync'
      );
    });

    it('should succeed in case of cache error during the project build procedure', async () => {
      try {
        setupDeploymentMocks();
        fs.readJsonSync.mockImplementation(() => {
          const error = new Error();
          error.code = 'ENOENT';
          throw error;
        });
        const { default: deploy } = await import('./deploy.js');

        await deploy({ alias: 'testalias1', yes: false });

        checkSuccessfulDeployment();
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
      }
    });

    it('should reuse alias smartContract property', async () => {
      setupDeploymentMocks({ aliasSmartContract: 'TestZkApp' });
      const { default: deploy } = await import('./deploy.js');

      await deploy({ alias: 'testalias1', yes: false });

      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)Your config.json was updated to always use this((.|\n)*)smart contract when deploying to this deploy alias((.|\n)*)/
        )
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /((.|\n)*)smart contract will be used((.|\n)*)for this deploy alias as specified in config((.|\n)*)/
        )
      );
    });

    it('should exit if relayer node is offline', async () => {
      setupDeploymentMocks({ syncStatus: 'OFFLINE' });
      process.exit.mockImplementation(() => {
        throw new Error('process.exit');
      });
      const { default: deploy } = await import('./deploy.js');

      await expect(deploy({ alias: 'testalias1', yes: false })).rejects.toThrow(
        'process.exit'
      );

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Transaction relayer node is offline. Please try again or use a different "url" for this deploy alias in your config.json'
        )
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should exit if relayer node is not synced', async () => {
      setupDeploymentMocks({ syncStatus: 'BOOTSTRAPPING' });
      process.exit.mockImplementation(() => {
        throw new Error('process.exit');
      });
      const { default: deploy } = await import('./deploy.js');

      await expect(deploy({ alias: 'testalias1', yes: false })).rejects.toThrow(
        'process.exit'
      );

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Transaction relayer node is not in a synced state.'
        )
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should exit if no fee payer account info found', async () => {
      setupDeploymentMocks({ provideAccount: false });
      process.exit.mockImplementation(() => {
        throw new Error('process.exit');
      });
      const { default: deploy } = await import('./deploy.js');

      await expect(deploy({ alias: 'testalias1', yes: false })).rejects.toThrow(
        'process.exit'
      );

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Failed to find the fee payer's account on chain."
        )
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should exit if no fee property configured for alias', async () => {
      setupDeploymentMocks({ provideFee: false });
      process.exit.mockImplementation(() => {
        throw new Error('process.exit');
      });
      const { default: deploy } = await import('./deploy.js');

      await expect(deploy({ alias: 'testalias1', yes: false })).rejects.toThrow(
        'process.exit'
      );

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'The "fee" property is not specified for this deploy alias in config.json.'
        )
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should exit in case of zkApp txn error', async () => {
      setupDeploymentMocks({ isFailedZkAppTxn: true });
      process.exit.mockImplementation(() => {
        throw new Error('process.exit');
      });
      const { default: deploy } = await import('./deploy.js');

      await expect(deploy({ alias: 'testalias1', yes: true })).rejects.toThrow(
        'process.exit'
      );

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should exit in case if no smart contract named export found', async () => {
      const contractName = 'TestZkApp';
      setupDeploymentMocks({ provideSmartContractNamedExport: false });
      process.exit.mockImplementation(() => {
        throw new Error('process.exit');
      });
      const { default: deploy } = await import('./deploy.js');

      await expect(deploy({ alias: 'testalias1', yes: true })).rejects.toThrow(
        'process.exit'
      );

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          `Failed to find the "${contractName}" smart contract in your build directory`
        )
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should exit in case if fee payer address equals zkapp address', async () => {
      setupDeploymentMocks({ matchFeePayerAndZkAppAddresses: true });
      process.exit.mockImplementation(() => {
        throw new Error('process.exit');
      });
      const { default: deploy } = await import('./deploy.js');

      await expect(deploy({ alias: 'testalias1', yes: true })).rejects.toThrow(
        'process.exit'
      );

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'The feepayer account is the same as the zkApp account.'
        )
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle smart contract init methods', async () => {
      setupDeploymentMocks({ provideInitMethod: true });
      const { default: deploy } = await import('./deploy.js');

      await deploy({ alias: 'testalias1', yes: true });

      checkSuccessfulDeployment();
    });
  });

  describe('sendGraphQL()', () => {
    it('should send a GraphQL request and return the response', async () => {
      jest.useFakeTimers();
      jest.spyOn(global, 'setTimeout');
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: 'response' }),
        })
      );
      const { sendGraphQL } = await import('./deploy.js');

      const result = await sendGraphQL('http://test.url', 'query');

      expect(result).toEqual({ data: 'response' });
    });

    it('should handle errors and return error object', async () => {
      jest.useFakeTimers();
      jest.spyOn(global, 'setTimeout');
      global.fetch = jest.fn(() => Promise.reject(new Error('network error')));
      const { sendGraphQL } = await import('./deploy.js');

      const result = await sendGraphQL('http://test.url', 'query');

      expect(result).toEqual({
        kind: 'error',
        message: new Error('network error'),
      });
      expect(setTimeout).toHaveBeenCalledTimes(1);
      jest.runAllTimers();
    });

    it('should handle failed request and return error object (!response.ok)', async () => {
      jest.useFakeTimers();
      jest.spyOn(global, 'setTimeout');
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ data: 'response' }),
        })
      );
      const { sendGraphQL } = await import('./deploy.js');

      const result = await sendGraphQL('http://test.url', 'query');

      expect(result).toEqual({
        kind: 'error',
      });
      expect(setTimeout).toHaveBeenCalledTimes(1);
      jest.runAllTimers();
    });
  });

  describe('sendZkAppQuery()', () => {
    it('should return the zkApp mutation query', async () => {
      const accountUpdatesJson = '{"foo": "bar"}';
      const { sendZkAppQuery } = await import('./deploy.js');

      const result = sendZkAppQuery(accountUpdatesJson);

      expect(result).toContain('mutation');
      expect(result).toContain('foo: "bar"');
    });
  });

  describe('getAccountQuery()', () => {
    it('should return the account query', async () => {
      const publicKey = 'testPublicKey';
      const { getAccountQuery } = await import('./deploy.js');

      const result = getAccountQuery(publicKey);

      expect(result).toContain('query');
      expect(result).toContain(`account(publicKey: "${publicKey}")`);
    });
  });

  describe('getErrorMessage()', () => {
    it('should return formatted error message', async () => {
      const error = {
        message: [{ message: 'error1' }, { message: 'error2' }],
      };
      const { getErrorMessage } = await import('./deploy.js');

      const result = getErrorMessage(error);

      expect(result).toContain('error1');
      expect(result).toContain('error2');
    });

    it('should return invalid nonce error message', async () => {
      const error = { message: [{ message: 'Invalid_nonce' }] };
      const { getErrorMessage } = await import('./deploy.js');

      const result = getErrorMessage(error);

      expect(result).toContain('An invalid account nonce was specified');
    });

    it('should return txn failure error message', async () => {
      const error = {
        message: 'Some error message',
      };
      const { getErrorMessage } = await import('./deploy.js');

      const result = getErrorMessage(error);

      expect(result).toContain('Failed to send transaction. Unknown error');
    });
  });

  describe('removeJsonQuotes()', () => {
    it('should remove quotes from JSON keys', async () => {
      const json = '{"foo": "bar"}';
      const { removeJsonQuotes } = await import('./deploy.js');

      const result = removeJsonQuotes(json);

      expect(result).toEqual(expect.stringMatching(/foo: "bar"/gi));
    });
  });

  describe('hasBreakingChanges()', () => {
    it('should detect breaking changes for major version 0', async () => {
      const { hasBreakingChanges } = await import('./deploy.js');

      const result = hasBreakingChanges('0.1.0', '0.2.0');

      expect(result).toBe(true);
    });

    it('should detect breaking changes for major version >= 1', async () => {
      const { hasBreakingChanges } = await import('./deploy.js');

      const result = hasBreakingChanges('1.0.0', '2.0.0');

      expect(result).toBe(true);
    });

    it('should not detect breaking changes', async () => {
      const { hasBreakingChanges } = await import('./deploy.js');

      const result = hasBreakingChanges('1.1.0', '1.1.0');

      expect(result).toBe(false);
    });
  });

  describe('getTxnUrl()', () => {
    it('should return the correct transaction URL for minascan', async () => {
      const graphQlUrl = 'https://api.minascan.io/node/devnet/v1/graphql';
      const txn = { data: { sendZkapp: { zkapp: { hash: 'txnHash' } } } };
      const { getTxnUrl } = await import('./deploy.js');

      const result = getTxnUrl(graphQlUrl, txn);

      expect(result).toBe('https://minascan.io/devnet/tx/txnHash?type=zk-tx');
    });

    it('should return the correct transaction hash if not minascan', async () => {
      const graphQlUrl = 'https://other.url/graphql';
      const txn = { data: { sendZkapp: { zkapp: { hash: 'txnHash' } } } };
      const { getTxnUrl } = await import('./deploy.js');

      const result = getTxnUrl(graphQlUrl, txn);

      expect(result).toBe('Transaction hash: txnHash');
    });
  });

  describe('getLatestCliVersion()', () => {
    it('should return the latest CLI version from npm registry', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ latest: '0.2.0' }),
        })
      );
      const { getLatestCliVersion } = await import('./deploy.js');

      const result = await getLatestCliVersion();

      expect(result).toBe('0.2.0');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/-/package/zkapp-cli/dist-tags'
      );
    });
  });

  describe('getInstalledCliVersion()', () => {
    it('should return the locally installed CLI version', async () => {
      execSync.mockReturnValueOnce(
        JSON.stringify({
          dependencies: { 'zkapp-cli': { version: '0.1.0' } },
        })
      );
      const { getInstalledCliVersion } = await import('./deploy.js');

      const result = getInstalledCliVersion();

      expect(result).toBe('0.1.0');
      expect(execSync).toHaveBeenCalledWith(
        'npm list --depth 0 --json --silent',
        { encoding: 'utf-8' }
      );
    });

    it('should return the globally installed CLI version if local version not found', async () => {
      execSync.mockReturnValueOnce(JSON.stringify({}));
      execSync.mockReturnValueOnce(
        JSON.stringify({
          dependencies: { 'zkapp-cli': { version: '0.2.0' } },
        })
      );
      const { getInstalledCliVersion } = await import('./deploy.js');

      const result = getInstalledCliVersion();

      expect(result).toBe('0.2.0');
      expect(execSync).toHaveBeenCalledWith(
        'npm list --depth 0 --json --silent',
        { encoding: 'utf-8' }
      );
      expect(execSync).toHaveBeenCalledWith(
        'npm list -g --depth 0 --json --silent',
        { encoding: 'utf-8' }
      );
    });
  });

  describe('chooseSmartContract()', () => {
    it('should return the smart contract specified in config', async () => {
      const config = {
        deployAliases: { 'test-alias': { smartContract: 'TestContract' } },
      };
      const build = { smartContracts: [{ className: 'TestContract' }] };
      const alias = 'test-alias';
      const { chooseSmartContract } = await import('./deploy.js');

      const result = chooseSmartContract(config, build, alias);

      expect(result).toBe('TestContract');
    });

    it('should return the only smart contract in the build if no smart contract specified in config', async () => {
      const config = { deployAliases: { 'test-alias': {} } };
      const build = { smartContracts: [{ className: 'TestContract' }] };
      const alias = 'test-alias';
      const { chooseSmartContract } = await import('./deploy.js');

      const result = chooseSmartContract(config, build, alias);

      expect(result).toBe('TestContract');
    });

    it('should return an empty string if multiple smart contracts exist and none specified in config', async () => {
      const config = { deployAliases: { 'test-alias': {} } };
      const build = {
        smartContracts: [
          { className: 'TestContract1' },
          { className: 'TestContract2' },
        ],
      };
      const alias = 'test-alias';
      const { chooseSmartContract } = await import('./deploy.js');

      const result = chooseSmartContract(config, build, alias);

      expect(result).toBe('');
    });
  });

  describe('getContractName()', () => {
    it('should exit if no smart contracts are found in the project', async () => {
      const config = { deployAliases: { 'test-alias': {} } };
      const build = { smartContracts: [] };
      const alias = 'test-alias';
      process.exit.mockImplementation(() => {
        throw new Error('process.exit');
      });
      const { getContractName } = await import('./deploy.js');

      await expect(getContractName(config, build, alias)).rejects.toThrow(
        'process.exit'
      );

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No smart contracts found in the project.')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Please make sure you have at least one class that extends the o1js `SmartContract`.'
        )
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Aborted.')
      );
    });

    it('should prompt user for smart contract if multiple exist and none specified in config', async () => {
      const config = { deployAliases: { 'test-alias': {} } };
      const build = {
        smartContracts: [
          { className: 'TestContract1' },
          { className: 'TestContract2' },
        ],
      };
      const alias = 'test-alias';
      enquirer.prompt.mockResolvedValue({ contractName: 'TestContract1' });
      const { getContractName } = await import('./deploy.js');

      const result = await getContractName(config, build, alias);

      expect(result).toBe('TestContract1');
      expect(enquirer.prompt).toHaveBeenCalledWith({
        type: 'select',
        name: 'contractName',
        choices: build.smartContracts.map((contract) => contract.className),
        message: expect.any(Function),
        prefix: expect.any(Function),
      });
    });

    it('should use configured smart contract', async () => {
      const config = {
        deployAliases: {
          'test-alias': {
            smartContract: 'TestContract1',
          },
        },
      };
      const build = {
        smartContracts: [
          { className: 'TestContract1' },
          { className: 'TestContract2' },
        ],
      };
      const alias = 'test-alias';
      enquirer.prompt.mockResolvedValue({ contractName: 'TestContract1' });
      const { getContractName } = await import('./deploy.js');

      const result = await getContractName(config, build, alias);

      expect(result).toBe('TestContract1');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "The 'TestContract1' smart contract will be used"
        )
      );
    });

    it('should use single smart contract', async () => {
      const config = { deployAliases: { 'test-alias': {} } };
      const build = {
        smartContracts: [{ className: 'TestContract1' }],
      };
      const alias = 'test-alias';
      enquirer.prompt.mockResolvedValue({ contractName: 'TestContract1' });
      const { getContractName } = await import('./deploy.js');

      const result = await getContractName(config, build, alias);

      expect(result).toBe('TestContract1');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Only one smart contract exists in the project: TestContract1'
        )
      );
    });
  });

  describe('findSmartContracts()', () => {
    it('should find and return smart contracts', async () => {
      glob.mockResolvedValue(['./build/src/TestZkApp.js']);
      jest.spyOn(path, 'isAbsolute').mockReturnValue(false);
      nodeFs.readFileSync.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return JSON.stringify({ main: 'index.js' });
        } else if (path.endsWith('TestZkApp.js')) {
          return `
            import { SmartContract } from 'o1js';
            export class TestZkApp extends SmartContract {}
          `;
        }
        return '';
      });
      nodeFs.existsSync.mockImplementation(() => true);
      nodeFs.readdirSync.mockReturnValue(['TestZkApp.js']);
      const { findSmartContracts } = await import('./deploy.js');

      const result = await findSmartContracts('build/**/*.js');

      expect(result).toEqual([
        { className: 'TestZkApp', filePath: './build/src/TestZkApp.js' },
      ]);
    });

    it('should convert backslashes to forward slashes on Windows platform', async () => {
      const originalPlatform = process.platform;
      try {
        Object.defineProperty(process, 'platform', {
          value: 'win32',
        });
        glob.mockResolvedValue(['./build/src/TestZkApp.js']);
        jest.spyOn(path, 'isAbsolute').mockReturnValue(false);
        nodeFs.readFileSync.mockImplementation((path) => {
          if (path.includes('package.json')) {
            return JSON.stringify({ main: 'index.js' });
          } else if (path.endsWith('TestZkApp.js')) {
            return `
            import { SmartContract } from 'o1js';
            export class TestZkApp extends SmartContract {}
          `;
          }
          return '';
        });
        nodeFs.existsSync.mockImplementation(() => true);
        nodeFs.readdirSync.mockReturnValue(['TestZkApp.js']);
        const { findSmartContracts } = await import('./deploy.js');

        const result = await findSmartContracts('build/**/*.js');

        expect(result).toEqual([
          { className: 'TestZkApp', filePath: './build/src/TestZkApp.js' },
        ]);
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
        });
      }
    });

    it('should handle no results', async () => {
      glob.mockResolvedValue(['./build/src/TestZkApp.js']);
      jest.spyOn(path, 'isAbsolute').mockReturnValue(false);
      nodeFs.readFileSync.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return JSON.stringify({ main: 'index.js' });
        } else if (path.endsWith('TestZkApp.js')) {
          return `
            export class TestZkApp extends SmartContract {}
          `;
        }
        return '';
      });
      nodeFs.existsSync.mockImplementation(() => true);
      nodeFs.readdirSync.mockReturnValue(['TestZkApp.js']);
      const { findSmartContracts } = await import('./deploy.js');

      const result = await findSmartContracts('build/**/*.js');

      expect(result).toEqual([]);
    });
  });

  describe('findZkProgramFile()', () => {
    it('should return the correct zkProgramVarName and zkProgramFile when a matching zkProgramNameArg is found', async () => {
      const buildPath = '/some/path';
      const zkProgramNameArg = 'myZkProgram';
      glob.mockResolvedValue(['/some/path/file1.js']);
      fs.readFileSync.mockReturnValue(
        `
            const myVar = ZkProgram({
              name: 'myZkProgram'
            });
          `
      );
      jest.spyOn(path, 'basename').mockReturnValue('file1.js');
      const { findZkProgramFile } = await import('./deploy.js');

      const result = await findZkProgramFile(buildPath, zkProgramNameArg);

      expect(result).toEqual({
        zkProgramVarName: 'myVar',
        zkProgramFile: 'file1.js',
      });
    });

    it('should return undefined if no matching zkProgramNameArg is found', async () => {
      const buildPath = '/some/path';
      const zkProgramNameArg = 'nonExistentZkProgram';
      glob.mockResolvedValue(['/some/path/file1.js']);
      fs.readFileSync.mockReturnValue(
        `
            const myVar = ZkProgram({
              name: 'myZkProgram'
            });
          `
      );
      jest.spyOn(path, 'basename').mockReturnValue('file1.js');
      const { findZkProgramFile } = await import('./deploy.js');

      const result = await findZkProgramFile(buildPath, zkProgramNameArg);

      expect(result).toBeUndefined();
    });

    it('should convert backslashes to forward slashes on Windows platform', async () => {
      const originalPlatform = process.platform;
      try {
        Object.defineProperty(process, 'platform', {
          value: 'win32',
        });
        const buildPath = '\\some\\path';
        const zkProgramNameArg = 'myZkProgram';
        glob.mockResolvedValue(['/some/path/file1.js']);
        fs.readFileSync.mockReturnValue(
          `
              const myVar = ZkProgram({
                name: 'myZkProgram'
              });
            `
        );
        jest.spyOn(path, 'basename').mockReturnValue('file1.js');
        const { findZkProgramFile } = await import('./deploy.js');

        const result = await findZkProgramFile(buildPath, zkProgramNameArg);

        expect(glob).toHaveBeenCalledWith('/some/path');
        expect(result).toEqual({
          zkProgramVarName: 'myVar',
          zkProgramFile: 'file1.js',
        });
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
        });
      }
    });
  });

  describe('getZkProgram()', () => {
    it('should return the ZkProgram when found', async () => {
      const projectRoot = '/some/path';
      const zkProgramNameArg = 'myZkProgram';
      const zkProgramFile = 'file1.js';
      const zkProgramMock = { name: 'myZkProgram' };
      glob.mockResolvedValue(['/some/path/file1.js']);
      fs.readFileSync.mockReturnValue(
        `
          const myVar = ZkProgram({
            name: 'myZkProgram'
          });
        `
      );
      jest.spyOn(path, 'basename').mockReturnValue('file1.js');
      dynamicImport.mockResolvedValue({ myVar: zkProgramMock });
      const { getZkProgram } = await import('./deploy.js');

      const result = await getZkProgram(projectRoot, zkProgramNameArg);

      expect(result).toBe(zkProgramMock);
      expect(dynamicImport).toHaveBeenCalledWith(
        `${projectRoot}/build/src/${zkProgramFile}`
      );
    });

    it('should handle Windows paths correctly', async () => {
      const originalPlatform = process.platform;
      try {
        Object.defineProperty(process, 'platform', {
          value: 'win32',
        });
        const projectRoot = 'C:\\some\\path';
        const zkProgramNameArg = 'myZkProgram';
        const zkProgramFile = 'file1.js';
        const zkProgramMock = { name: 'myZkProgram' };
        glob.mockResolvedValue(['/some/path/file1.js']);
        fs.readFileSync.mockReturnValue(
          `
          const myVar = ZkProgram({
            name: 'myZkProgram'
          });
        `
        );
        jest.spyOn(path, 'basename').mockReturnValue('file1.js');
        dynamicImport.mockResolvedValue({ myVar: zkProgramMock });
        const { getZkProgram } = await import('./deploy.js');

        const result = await getZkProgram(projectRoot, zkProgramNameArg);

        expect(result).toBe(zkProgramMock);
        expect(dynamicImport).toHaveBeenCalledWith(
          `file://${projectRoot}/build/src/${zkProgramFile}`
        );
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
        });
      }
    });
  });

  describe('getZkProgramNameArg()', () => {
    it('should return the zkProgramNameArg when the message matches the regex and the names are the same', async () => {
      const message =
        'depends on myZkProgram, but we cannot find compilation output for myZkProgram';
      const { getZkProgramNameArg } = await import('./deploy.js');
      const result = getZkProgramNameArg(message);
      expect(result).toBe('myZkProgram');
    });

    it('should return null when the message matches the regex but the names are different', async () => {
      const message =
        'depends on myZkProgram, but we cannot find compilation output for otherZkProgram';
      const { getZkProgramNameArg } = await import('./deploy.js');
      const result = getZkProgramNameArg(message);
      expect(result).toBeNull();
    });

    it('should return null when the message does not match the regex', async () => {
      const message = 'this is a random message without the expected format';
      const { getZkProgramNameArg } = await import('./deploy.js');
      const result = getZkProgramNameArg(message);
      expect(result).toBeNull();
    });

    it('should return null when the message is empty', async () => {
      const message = '';
      const { getZkProgramNameArg } = await import('./deploy.js');
      const result = getZkProgramNameArg(message);
      expect(result).toBeNull();
    });

    it('should throw when the message is null or undefined', async () => {
      const { getZkProgramNameArg } = await import('./deploy.js');
      try {
        getZkProgramNameArg(null);
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
      }

      try {
        getZkProgramNameArg(undefined);
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
      }
    });

    it('should return null when the message contains special characters but does not match the regex', async () => {
      const message =
        'depends on my$ZkProgram, but we cannot find compilation output for my$ZkProgram';
      const { getZkProgramNameArg } = await import('./deploy.js');
      const result = getZkProgramNameArg(message);
      expect(result).toBeNull();
    });
  });

  describe('generateVerificationKey()', () => {
    const projectRoot = '/project/root';
    const contractName = 'TestContract';
    const zkAppAddress = 'zkAppAddress';

    it('should return cached verification key if no changes detected and no init method', async () => {
      const zkApp = { digest: jest.fn().mockResolvedValue('digest1') };
      const cache = {
        TestContract: { digest: 'digest1', verificationKey: 'cachedKey' },
      };
      fs.readJsonSync.mockReturnValue(cache);
      const { generateVerificationKey } = await import('./deploy.js');

      const result = await generateVerificationKey(
        projectRoot,
        contractName,
        zkApp,
        zkAppAddress,
        false
      );

      expect(result).toEqual({
        verificationKey: 'cachedKey',
        isCached: true,
      });
    });

    it('should compile zkApp and update cache if digest changes', async () => {
      const zkApp = {
        digest: jest.fn().mockResolvedValue('newDigest'),
        compile: jest.fn().mockResolvedValue({ verificationKey: 'newKey' }),
      };
      const cache = {
        TestContract: { digest: 'oldDigest', verificationKey: 'cachedKey' },
      };
      fs.readJsonSync.mockReturnValue(cache);
      const { generateVerificationKey } = await import('./deploy.js');

      const result = await generateVerificationKey(
        projectRoot,
        contractName,
        zkApp,
        zkAppAddress,
        false
      );

      expect(result).toEqual({ verificationKey: 'newKey', isCached: false });
      expect(zkApp.compile).toHaveBeenCalledWith(zkAppAddress);
      expect(fs.writeJSONSync).toHaveBeenCalledWith(
        `${projectRoot}/build/cache.json`,
        { TestContract: { digest: 'newDigest', verificationKey: 'newKey' } },
        { spaces: 2 }
      );
    });

    it('should compile zkApp if init method exists even if digest is unchanged', async () => {
      const zkApp = {
        digest: jest.fn().mockResolvedValue('digest1'),
        compile: jest.fn().mockResolvedValue({ verificationKey: 'newKey' }),
      };
      const cache = {
        TestContract: { digest: 'digest1', verificationKey: 'cachedKey' },
      };
      fs.readJsonSync.mockReturnValue(cache);
      const { generateVerificationKey } = await import('./deploy.js');

      const result = await generateVerificationKey(
        projectRoot,
        contractName,
        zkApp,
        zkAppAddress,
        true
      );

      expect(result).toEqual({ verificationKey: 'newKey', isCached: false });
      expect(zkApp.compile).toHaveBeenCalledWith(zkAppAddress);
      expect(fs.writeJSONSync).toHaveBeenCalledWith(
        `${projectRoot}/build/cache.json`,
        { TestContract: { digest: 'digest1', verificationKey: 'newKey' } },
        { spaces: 2 }
      );
    });

    it('should handle errors during zkApp compilation and return verification key if provided', async () => {
      const zkApp = {
        digest: jest.fn().mockResolvedValue('newDigest'),
        compile: jest.fn().mockRejectedValue(new Error('compilation error')),
      };
      const cache = {
        TestContract: { digest: 'oldDigest', verificationKey: 'cachedKey' },
      };
      fs.readJsonSync.mockReturnValue(cache);
      const { generateVerificationKey } = await import('./deploy.js');

      const result = await generateVerificationKey(
        projectRoot,
        contractName,
        zkApp,
        zkAppAddress,
        false
      );

      expect(zkApp.compile).toHaveBeenCalledWith(zkAppAddress);
      expect(result).toEqual({ isCached: false, verificationKey: undefined });
    });

    it('should init cache', async () => {
      const zkApp = {
        digest: jest.fn().mockResolvedValue('digest'),
        compile: jest
          .fn()
          .mockResolvedValue({ verificationKey: 'verificationKey' }),
      };
      const cache = {};
      fs.readJsonSync.mockReturnValue(cache);
      const { generateVerificationKey } = await import('./deploy.js');

      const result = await generateVerificationKey(
        projectRoot,
        contractName,
        zkApp,
        zkAppAddress,
        false
      );

      expect(zkApp.compile).toHaveBeenCalledWith(zkAppAddress);
      expect(result).toEqual({
        isCached: false,
        verificationKey: 'verificationKey',
      });
    });

    it('should import and compile zkProgram', async () => {
      const zkApp = {
        digest: jest.fn().mockResolvedValue('digest'),
        compile: jest
          .fn()
          .mockResolvedValue({ verificationKey: 'verificationKey' }),
      };
      const cache = {
        TestContract: {
          digest: 'digest',
          verificationKey: 'cachedVerificationKey',
          zkProgram: 'myZkProgram',
        },
        myZkProgram: {},
      };
      fs.readJsonSync.mockReturnValue(cache);
      const zkProgramMock = {
        name: 'myZkProgram',
        digest: jest.fn().mockResolvedValue('digest1'),
        compile: jest.fn(),
      };
      glob.mockResolvedValue(['/some/path/file1.js']);
      fs.readFileSync.mockReturnValue(
        `
          const myVar = ZkProgram({
            name: 'myZkProgram'
          });
        `
      );
      jest.spyOn(path, 'basename').mockReturnValue('file1.js');
      dynamicImport.mockResolvedValue({ myVar: zkProgramMock });
      const { generateVerificationKey } = await import('./deploy.js');

      const result = await generateVerificationKey(
        projectRoot,
        contractName,
        zkApp,
        zkAppAddress,
        false
      );

      expect(fs.writeJSONSync).toHaveBeenCalledWith(
        `${projectRoot}/build/cache.json`,
        {
          TestContract: {
            digest: 'digest',
            verificationKey: 'cachedVerificationKey',
            zkProgram: 'myZkProgram',
          },
          myZkProgram: {
            digest: 'digest1',
          },
        },
        { spaces: 2 }
      );
      expect(result).toEqual({
        isCached: false,
        verificationKey: 'cachedVerificationKey',
      });
    });

    it('should set zkProgramNameArg based on ZkProgram that smart contract verifies', async () => {
      const zkApp = {
        digest: jest.fn().mockResolvedValue('newDigest'),
        compile: jest
          .fn()
          .mockRejectedValue(
            new Error(
              'depends on TestContract, but we cannot find compilation output for myZkProgram'
            )
          ),
      };
      const cache = {
        TestContract: { digest: 'oldDigest', verificationKey: 'cachedKey' },
      };
      fs.readJsonSync.mockReturnValue(cache);
      const { generateVerificationKey } = await import('./deploy.js');

      const result = await generateVerificationKey(
        projectRoot,
        contractName,
        zkApp,
        zkAppAddress,
        false
      );

      expect(zkApp.compile).toHaveBeenCalledWith(zkAppAddress);
      expect(result).toEqual({ isCached: false, verificationKey: undefined });
    });

    it('should import and compile zkProgram if smart contract to deploy verifies it', async () => {
      const zkApp = {
        digest: jest.fn().mockResolvedValue('digest'),
        compile: jest
          .fn()
          .mockResolvedValue({ verificationKey: 'verificationKey' }),
      };
      const cache = {
        TestContract: {
          digest: 'digest',
          verificationKey: 'cachedVerificationKey',
          zkProgram: 'myZkProgram',
        },
        myZkProgram: {},
      };
      fs.readJsonSync.mockReturnValue(cache);
      const zkProgramMock = {
        name: 'myZkProgram',
        digest: jest.fn().mockResolvedValue('digest1'),
        compile: jest.fn(),
      };
      glob.mockResolvedValue(['/some/path/file1.js']);
      fs.readFileSync.mockReturnValue(
        `
          const myVar = ZkProgram({
            name: 'myZkProgram'
          });
        `
      );
      jest.spyOn(path, 'basename').mockReturnValue('file1.js');
      dynamicImport.mockResolvedValue({ myVar: zkProgramMock });
      const { generateVerificationKey } = await import('./deploy.js');

      const result = await generateVerificationKey(
        projectRoot,
        contractName,
        zkApp,
        zkAppAddress,
        true
      );

      expect(fs.writeJSONSync).toHaveBeenCalledWith(
        `${projectRoot}/build/cache.json`,
        {
          TestContract: {
            digest: 'digest',
            verificationKey: 'verificationKey',
            zkProgram: 'myZkProgram',
          },
          myZkProgram: {
            digest: 'digest1',
          },
        },
        { spaces: 2 }
      );
      expect(result).toEqual({
        isCached: false,
        verificationKey: 'verificationKey',
      });
    });

    it('should import and compile zkProgram if smart contract to deploy verifies it', async () => {
      const zkApp = {
        digest: jest.fn().mockResolvedValue('digest'),
        compile: jest
          .fn()
          .mockResolvedValue({ verificationKey: 'verificationKey' }),
      };
      const cache = {
        TestContract: {
          digest: 'digest',
          verificationKey: 'cachedVerificationKey',
          zkProgram: 'myZkProgram',
        },
        myZkProgram: null,
      };
      fs.readJsonSync.mockReturnValue(cache);
      const zkProgramMock = {
        name: 'myZkProgram',
        digest: jest.fn().mockResolvedValue('digest1'),
        compile: jest.fn(),
      };
      glob.mockResolvedValue(['/some/path/file1.js']);
      fs.readFileSync.mockReturnValue(
        `
          const myVar = ZkProgram({
            name: 'myZkProgram'
          });
        `
      );
      jest.spyOn(path, 'basename').mockReturnValue('file1.js');
      dynamicImport.mockResolvedValue({ myVar: zkProgramMock });
      const { generateVerificationKey } = await import('./deploy.js');

      const result = await generateVerificationKey(
        projectRoot,
        contractName,
        zkApp,
        zkAppAddress,
        true
      );

      expect(fs.writeJSONSync).toHaveBeenCalledWith(
        `${projectRoot}/build/cache.json`,
        {
          TestContract: {
            digest: 'digest',
            verificationKey: 'verificationKey',
            zkProgram: 'myZkProgram',
          },
          myZkProgram: {
            digest: 'digest1',
          },
        },
        { spaces: 2 }
      );
      expect(result).toEqual({
        isCached: false,
        verificationKey: 'verificationKey',
      });
    });
  });
});

async function setupCommonMocks() {
  findPrefix.mockResolvedValue('/project/root');
  jest.spyOn(global, 'fetch').mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ latest: '0.0.0' }),
    })
  );
  execSync.mockImplementation(() => JSON.stringify({}));
  process.exit.mockImplementation(() => {
    throw new Error('process.exit');
  });
}

function mockFetchVersion(version) {
  jest.spyOn(global, 'fetch').mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ latest: version }),
    })
  );
}

function mockFetchEndpoints({
  syncStatus = 'SYNCED',
  provideAccount = true,
  isFailedZkAppTxn = false,
} = {}) {
  jest.spyOn(global, 'fetch').mockImplementation((endpoint, options) => {
    if (options?.body?.includes('syncStatus')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { syncStatus } }),
      });
    } else if (options?.body?.includes('account')) {
      const account = { data: { account: {} } };
      if (!provideAccount) {
        delete account.data.account;
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(account),
      });
    } else if (options?.body?.includes('sendZkapp')) {
      const txnResponse = isFailedZkAppTxn
        ? { kind: 'error' }
        : {
            data: { sendZkapp: { zkapp: { hash: 'txnHash' } } },
          };
      return Promise.resolve({
        ok: !isFailedZkAppTxn,
        json: () => Promise.resolve(txnResponse),
      });
    } else if (endpoint.includes('npmjs.org')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ latest: '0.0.0' }),
      });
    }
  });
}

function setupDeploymentMocks({
  aliasSmartContract,
  provideAliasUrl = true,
  provideFee = true,
  provideSmartContractNamedExport = true,
  matchFeePayerAndZkAppAddresses = false,
  provideInitMethod = false,
  provideAccount,
  syncStatus,
  isFailedZkAppTxn,
} = {}) {
  jest.useFakeTimers();
  findPrefix.mockResolvedValue('/project/root');
  jest.spyOn(global, 'fetch').mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ latest: '0.0.0' }),
    })
  );
  execSync.mockImplementation(() => JSON.stringify({}));
  mockFetchEndpoints({
    syncStatus,
    provideAccount,
    isFailedZkAppTxn,
  });
  execSync.mockReturnValueOnce(
    JSON.stringify({
      dependencies: { 'zkapp-cli': { version: '0.0.0' } },
    })
  );
  enquirer.prompt.mockImplementation(async () => ({
    name: 'testalias1',
  }));
  glob.mockResolvedValue(['./build/src/TestZkApp.js']);
  jest.spyOn(path, 'isAbsolute').mockReturnValue(false);
  nodeFs.readFileSync.mockImplementation((path) => {
    if (path.includes('package.json')) {
      return JSON.stringify({ main: 'index.js' });
    } else if (path.endsWith('TestZkApp.js')) {
      return `
            import { SmartContract } from 'o1js';
            export class TestZkApp extends SmartContract {}
          `;
    } else if (path.endsWith('config.json')) {
      const config = {
        deployAliases: {
          testalias1: {
            url: 'http://test.url',
            fee: 0.01,
          },
          testalias2: {},
        },
      };
      if (aliasSmartContract) {
        config.deployAliases.testalias1.smartContract = aliasSmartContract;
      }
      if (!provideAliasUrl) {
        delete config.deployAliases.testalias1.url;
      }
      if (!provideFee) {
        delete config.deployAliases.testalias1.fee;
      }
      return JSON.stringify(config);
    }
    return '';
  });
  dynamicImport.mockImplementation((path) => {
    if (path.includes('TestZkApp.js')) {
      const smartContractForImport = {
        TestZkApp: {
          _methods: [{ methodName: 'zkAppMethod' }],
          digest: jest.fn().mockResolvedValue('digest1'),
          compile: jest
            .fn()
            .mockImplementation(() => ({ verificationKey: 'newKey' })),
          deploy: jest.fn(),
        },
      };
      if (provideInitMethod) {
        smartContractForImport.TestZkApp._methods[0] = { methodName: 'init' };
      }
      if (!provideSmartContractNamedExport) {
        Object.defineProperty(
          smartContractForImport,
          'AnotherTestZkApp',
          Object.getOwnPropertyDescriptor(smartContractForImport, 'TestZkApp')
        );
        delete smartContractForImport.TestZkApp;
      }
      return Promise.resolve(smartContractForImport);
    } else if (path.includes('o1js')) {
      return Promise.resolve({
        Mina: {
          Network: jest.fn(),
          setActiveInstance: jest.fn(),
          transaction: jest.fn().mockImplementation(async () => {
            return Promise.resolve({
              prove: jest.fn(),
              sign: () => ({
                toJSON: () =>
                  JSON.stringify({ hash: 'txnHash', kind: 'zkAppTxn' }),
              }),
            });
          }),
        },
        PrivateKey: {
          fromBase58: jest
            .fn()
            .mockReturnValueOnce({
              toPublicKey: () => {
                return {
                  toBase58: () => 'base58',
                };
              },
              toBase58: () => 'base58',
            })
            .mockReturnValueOnce({
              toPublicKey: () => {
                return {
                  toBase58: () =>
                    matchFeePayerAndZkAppAddresses ? 'base58' : 'base58-1',
                };
              },
              toBase58: () =>
                matchFeePayerAndZkAppAddresses ? 'base58' : 'base58-1',
            }),
        },
        AccountUpdate: {
          fundNewAccount: jest.fn(),
        },
      });
    }
  });
  nodeFs.existsSync.mockImplementation(() => true);
  nodeFs.readdirSync.mockReturnValue(['TestZkApp.js']);
  jest.spyOn(Mina, 'Network').mockImplementation(() => jest.fn());
  const cache = {
    TestZkApp: {
      digest: 'digest1',
      verificationKey: 'cachedKey',
      compile: jest
        .fn()
        .mockImplementation(() => ({ verificationKey: 'newKey' })),
      deploy: jest.fn(),
    },
    verificationKey: 'cachedKey',
    isCached: true,
  };
  fs.readJsonSync.mockReturnValue(cache);
}

function checkSuccessfulDeployment() {
  expect(execSync).toHaveBeenCalledWith(
    expect.stringContaining('npm run build --silent')
  );
  expect(console.log).toHaveBeenCalledWith(
    expect.stringContaining('Success! Deploy transaction sent.')
  );
  expect(process.exit).toHaveBeenCalledWith(0);
}
