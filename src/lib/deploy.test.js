import { chooseSmartContract } from './deploy.js';

describe('deploy.js', () => {
  describe('findSmartContracts()', () => {
    it.skip('should be tested', () => {});
  });
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
            smartContracts: ['Bar'],
          };
          const result = chooseSmartContract(config, deploy, deployAliasName);
          expect(result).toEqual('Bar');
        });
      });
      describe('if 2+ smart contract exists in the build (deploy.json)', () => {
        it('should select that smart contract', () => {
          const deploy = {
            smartContracts: ['Foo', 'Bar'],
          };
          const deployAliasName = 'mainnet';
          const result = chooseSmartContract(config, deploy, deployAliasName);
          expect(result).toEqual(''); // falsy
        });
      });
    });
  });
});
