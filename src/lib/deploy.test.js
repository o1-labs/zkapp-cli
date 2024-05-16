import { jest } from '@jest/globals';
import fs from 'node:fs';
import { chooseSmartContract } from './deploy.js';
import { findIfClassExtendsOrImplementsSmartContract } from './helpers.js';

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(fs, 'readFileSync').mockImplementation((path) => {
    if (path.includes('package.json')) {
      return JSON.stringify({ main: 'index.js' });
    } else if (path.endsWith('TestZkApp.js')) {
      return `
        import { SmartContract } from 'o1js';
        export class TestZkApp extends SmartContract {}
      `;
    } else if (path.endsWith('MultipleInheritance.js')) {
      return `
        import { SmartContract } from 'o1js';
        export class TestZkApp extends SmartContract {}
        export class ZkAppWithSecondInheritanceLevel extends TestZkApp {}
        export class ZkAppWithThirdInheritanceLevel extends ZkAppWithSecondInheritanceLevel {}
      `;
    } else if (path.endsWith('ZkAppWithSecondInheritanceLevel.js')) {
      return `
        import { TestZkApp } from './TestZkApp.js';
        export class ZkAppWithSecondInheritanceLevel extends TestZkApp {}
      `;
    } else if (path.endsWith('ZkAppWithThirdInheritanceLevel.js')) {
      return `
        import { ZkAppWithSecondInheritanceLevel } from './ZkAppWithSecondInheritanceLevel.js';
        export class ZkAppWithThirdInheritanceLevel extends ZkAppWithSecondInheritanceLevel {}
      `;
    } else if (path.endsWith('SomeLibOnFileSystem.js')) {
      return `
        export class SmartContract {}
      `;
    } else if (path.endsWith('NotO1jsSmartContractLib.js')) {
      return `
        import { SmartContract } from 'whatever';
        export class NotO1jsSmartContract extends SmartContract {}
      `;
    } else if (path.endsWith('NotO1jsSmartContractFs.js')) {
      return `
        import { SmartContract } from './SomeLibOnFileSystem.js';
        export class NotO1jsSmartContract extends SmartContract {}
      `;
    }
    return '';
  });
  jest.spyOn(fs, 'existsSync').mockImplementation(() => true);
  jest.spyOn(fs, 'readdirSync').mockImplementation(() => []);
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('deploy.js', () => {
  describe('chooseSmartContract()', () => {
    describe('if the network in config.json has a smartContract specified', () => {
      it('should select that smart contract', () => {
        const config = {
          version: 1,
          deployAliases: {
            mainnet: {
              smartContract: 'Foo',
            },
          },
        };
        const deploy = {};
        const deployAliasName = 'mainnet';

        const result = chooseSmartContract(config, deploy, deployAliasName);
        expect(result).toEqual('Foo');
      });
    });

    describe('if the network in config.json does NOT have a smartContract specified', () => {
      const config = {
        version: 1,
        deployAliases: {
          mainnet: {},
        },
      };
      const deployAliasName = 'mainnet';
      describe('if only one smart contract exists in the build (deploy.json)', () => {
        it('should select that smart contract', () => {
          const deploy = {
            smartContracts: [{ className: 'Bar', filePath: './Bar.js' }],
          };
          const result = chooseSmartContract(config, deploy, deployAliasName);
          expect(result).toEqual('Bar');
        });
      });
      describe('if 2+ smart contract exists in the build (deploy.json)', () => {
        it('should select that smart contract', () => {
          const deploy = {
            smartContracts: [
              { className: 'Foo', filePath: './Foo.js' },
              { className: 'Baz', filePath: './Baz.js' },
            ],
          };
          const deployAliasName = 'mainnet';
          const result = chooseSmartContract(config, deploy, deployAliasName);
          expect(result).toEqual(''); // falsy
        });
      });
    });
  });

  describe('SmartContract inheritance detection', () => {
    it('should identify classes extending SmartContract from o1js directly', async () => {
      fs.readdirSync.mockReturnValue(['TestZkApp.js']);
      const result = findIfClassExtendsOrImplementsSmartContract(
        './build/src/TestZkApp.js'
      );
      expect(result).toEqual([
        { className: 'TestZkApp', filePath: './build/src/TestZkApp.js' },
      ]);
    });

    it('should identify classes extending another class that extends SmartContract from o1js within the same file', async () => {
      fs.readdirSync.mockReturnValue(['MultipleInheritance.js']);
      const result = findIfClassExtendsOrImplementsSmartContract(
        './build/src/MultipleInheritance.js'
      );
      expect(result).toEqual([
        {
          className: 'TestZkApp',
          filePath: './build/src/MultipleInheritance.js',
        },
        {
          className: 'ZkAppWithSecondInheritanceLevel',
          filePath: './build/src/MultipleInheritance.js',
        },
        {
          className: 'ZkAppWithThirdInheritanceLevel',
          filePath: './build/src/MultipleInheritance.js',
        },
      ]);
    });

    it('should identify classes extending another class that extends SmartContract from o1js with imports across files', async () => {
      fs.readdirSync.mockReturnValue([
        'TestZkApp.js',
        'ZkAppWithSecondInheritanceLevel.js',
      ]);
      const resultForTestZkApp = findIfClassExtendsOrImplementsSmartContract(
        './build/src/TestZkApp.js'
      );
      expect(resultForTestZkApp).toEqual([
        { className: 'TestZkApp', filePath: './build/src/TestZkApp.js' },
      ]);

      const resultForZkAppWithSecondInheritanceLevel =
        findIfClassExtendsOrImplementsSmartContract(
          './build/src/ZkAppWithSecondInheritanceLevel.js'
        );
      expect(resultForZkAppWithSecondInheritanceLevel).toEqual([
        {
          className: 'ZkAppWithSecondInheritanceLevel',
          filePath: './build/src/ZkAppWithSecondInheritanceLevel.js',
        },
      ]);

      const resultForZkAppWithThirdInheritanceLevel =
        findIfClassExtendsOrImplementsSmartContract(
          './build/src/ZkAppWithThirdInheritanceLevel.js'
        );
      expect(resultForZkAppWithThirdInheritanceLevel).toEqual([
        {
          className: 'ZkAppWithThirdInheritanceLevel',
          filePath: './build/src/ZkAppWithThirdInheritanceLevel.js',
        },
      ]);
    });

    it('should skip classes extending SmartContract not from o1js', async () => {
      fs.readdirSync.mockReturnValue(['NotO1jsSmartContractLib.js']);
      const result = findIfClassExtendsOrImplementsSmartContract(
        './build/src/NotO1jsSmartContractLib.js'
      );
      expect(result).toEqual([]);
    });

    it('should skip classes extending SmartContract not from o1js with imports across files', async () => {
      fs.readdirSync.mockReturnValue([
        'SomeLibOnFileSystem.js',
        'NotO1jsSmartContractFs.js',
      ]);
      const result = findIfClassExtendsOrImplementsSmartContract(
        './build/src/NotO1jsSmartContractFs.js'
      );
      expect(result).toEqual([]);
    });
  });
});
