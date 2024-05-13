import { jest } from '@jest/globals';
import fs from 'node:fs';
import { chooseSmartContract } from './deploy.js';
import { findIfClassExtendsOrImplementsSmartContract } from './helpers.js';

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(fs, 'readFileSync').mockImplementation(() => {});
  jest.spyOn(fs, 'readdirSync').mockImplementation(() => []);
});

// After all tests, restore the original fs functions
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
    it('should identify classes extending SmartContract directly', async () => {
      const fakeFileContent = `
        export class TestZkApp extends SmartContract {}
      `;

      fs.readFileSync.mockReturnValue(fakeFileContent); // Use the mocked function
      fs.readdirSync.mockReturnValue(['TestZkApp.js']);

      const result = await findIfClassExtendsOrImplementsSmartContract(
        './build/TestZkApp.js'
      );
      expect(result).toEqual([
        { className: 'TestZkApp', filePath: './build/TestZkApp.js' },
      ]);
    });

    it('should identify classes extending another class that extends SmartContract within the same file', async () => {
      const fakeFileContent = `
        export class TestZkApp extends SmartContract {}
        export class AnotherTestZkApp extends TestZkApp {}
      `;

      fs.readFileSync.mockReturnValue(fakeFileContent);
      fs.readdirSync.mockReturnValue(['MultipleInheritance.js']);

      const result = await findIfClassExtendsOrImplementsSmartContract(
        './build/MultipleInheritance.js'
      );
      expect(result).toEqual([
        { className: 'TestZkApp', filePath: './build/MultipleInheritance.js' },
        {
          className: 'AnotherTestZkApp',
          filePath: './build/MultipleInheritance.js',
        },
      ]);
    });

    it('should identify classes extending another class that extends SmartContract with imports across files', async () => {
      const fakeTestZkAppContent = `
        export class TestZkApp extends SmartContract {}
      `;
      const fakeAnotherTestZkAppContent = `
        import { TestZkApp } from './TestZkApp.js';
        export class AnotherTestZkApp extends TestZkApp {}
      `;

      fs.readFileSync.mockImplementation((path) => {
        if (path.includes('AnotherTestZkApp.js'))
          return fakeAnotherTestZkAppContent;
        if (path.includes('TestZkApp.js')) return fakeTestZkAppContent;
        return '';
      });
      fs.readdirSync.mockReturnValue(['TestZkApp.js', 'AnotherTestZkApp.js']);

      const resultForTestZkApp =
        await findIfClassExtendsOrImplementsSmartContract(
          './build/TestZkApp.js'
        );
      expect(resultForTestZkApp).toEqual([
        { className: 'TestZkApp', filePath: './build/TestZkApp.js' },
      ]);

      const resultForAnotherTestZkApp =
        await findIfClassExtendsOrImplementsSmartContract(
          './build/AnotherTestZkApp.js'
        );
      expect(resultForAnotherTestZkApp).toEqual([
        {
          className: 'AnotherTestZkApp',
          filePath: './build/AnotherTestZkApp.js',
        },
      ]);
    });
  });
});
