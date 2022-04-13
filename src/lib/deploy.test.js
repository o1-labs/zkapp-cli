const {
  chooseSmartContract,
  getExportStatementFromContract,
  addDefaultExportToContract,
} = require('./deploy');

describe('deploy.js', () => {
  describe('findSmartContracts()', () => {
    it.skip('should be tested', () => {});
  });
  describe('chooseSmartContract()', () => {
    describe('if the network in config.json has a smartContract specified', () => {
      it('should select that smart contract', () => {
        const config = {
          version: 1,
          networks: {
            mainnet: {
              smartContract: 'Foo',
            },
          },
        };
        const deploy = {};
        const network = 'mainnet';
        const result = chooseSmartContract(config, deploy, network);
        expect(result).toEqual('Foo');
      });
    });
    describe('if the network in config.json does NOT have a smartContract specified', () => {
      const config = {
        version: 1,
        networks: {
          mainnet: {},
        },
      };
      const network = 'mainnet';
      describe('if only one smart contract exists in the build (deploy.json)', () => {
        it('should select that smart contract', () => {
          const deploy = {
            smartContracts: ['Bar'],
          };
          const result = chooseSmartContract(config, deploy, network);
          expect(result).toEqual('Bar');
        });
      });
      describe('if 2+ smart contract exists in the build (deploy.json)', () => {
        it('should select that smart contract', () => {
          const deploy = {
            smartContracts: ['Foo', 'Bar'],
          };
          const result = chooseSmartContract(config, deploy, network);
          expect(result).toEqual(''); // falsy
        });
      });
    });
  });

  describe('getExportStatementFromContract()', () => {
    describe('Single Class', () => {
      it(`should return an empty string from a class that has no export statement`, async () => {
        const contractName = 'Foo';
        const contract = `class ${contractName} extends SmartContract {}`;
        const exportStatement = await getExportStatementFromContract(
          contractName,
          contract
        );
        expect(exportStatement).toBeFalsy();
      });
      it(`should return 'export' from a class that has an 'export' statement`, async () => {
        const contractName = 'Foo';
        const contract = `export class ${contractName} extends SmartContract {}`;
        const exportStatement = await getExportStatementFromContract(
          contractName,
          contract
        );
        expect(exportStatement.trim()).toEqual('export');
      });
      it(`should return 'export default' from a class that has an 'export default' statement`, async () => {
        const contractName = 'Foo';
        const contract = `export default class ${contractName} extends SmartContract {}`;
        const exportStatement = await getExportStatementFromContract(
          contractName,
          contract
        );
        expect(exportStatement.trim()).toEqual('export default');
      });
    });
    describe('Multiple Classes', () => {
      it(`should return an empty string from a class that has no export statement`, async () => {
        const contractName = 'Foo';
        const contract = `
        class Bar extends SmartContract {};
        class ${contractName} extends SmartContract {}`;
        const exportStatement = await getExportStatementFromContract(
          contractName,
          contract
        );
        expect(exportStatement.trim()).toBeFalsy();
      });
      it(`should return 'export' from a class that has an 'export' statement`, async () => {
        const contractName = 'Foo';
        const contract = `
        export class Bar extends SmartContract {};
        export class ${contractName} extends SmartContract {}`;
        const exportStatement = await getExportStatementFromContract(
          contractName,
          contract
        );
        expect(exportStatement.trim()).toEqual('export');
      });
      it(`should return 'export default' from a class that has an 'export default' statement`, async () => {
        const contractName = 'Foo';
        const contract = `
        export class Bar extends SmartContract {};
        export default class ${contractName} extends SmartContract {}`;
        const exportStatement = await getExportStatementFromContract(
          contractName,
          contract
        );
        expect(exportStatement.trim()).toEqual('export default');
      });
    });
  });
  describe('addDefaultExportToContract()', () => {
    describe('Single Class', () => {
      it(`should add 'default export' to a class with no exports`, async () => {
        const contractName = 'Foo';
        const contract = `class ${contractName} extends SmartContract {}`;
        const exportedContract = await addDefaultExportToContract(
          contractName,
          contract
        );
        const foundExportStatement = exportedContract.match(
          new RegExp(
            `export default class ${contractName} extends SmartContract`,
            'gi'
          )
        );
        expect(foundExportStatement.length).toBeTruthy();
      });
      it(`should add 'default export' to a class with an export statement`, async () => {
        const contractName = 'Foo';
        const contract = `export class ${contractName} extends SmartContract {}`;
        const exportedContract = await addDefaultExportToContract(
          contractName,
          contract
        );
        const foundExportStatement = exportedContract.match(
          new RegExp(
            `export default class ${contractName} extends SmartContract`,
            'gi'
          )
        );
        expect(foundExportStatement.length).toBeTruthy();
      });
      it(`should not add 'default export' to an invalid class`, async () => {
        const contract = `export class Foo extends SmartContract {}`;
        const exportedContract = await addDefaultExportToContract(
          'NotValidContract',
          contract
        );
        const foundExportStatement = exportedContract.match(
          new RegExp(`export default class Foo extends SmartContract`, 'gi')
        );
        expect(foundExportStatement).toBeFalsy();
      });
    });
    describe('Multiple Classes', () => {
      it(`should add 'default export' the specified class with no exports`, async () => {
        const contractName = 'Foo';
        const contract = `
        class Bar extends SmartContract {};
        class ${contractName} extends SmartContract {}`;
        const exportedContract = await addDefaultExportToContract(
          contractName,
          contract,
          ''
        );
        const foundExportStatement = exportedContract.match(
          new RegExp(
            `export default class ${contractName} extends SmartContract`,
            'gi'
          )
        );
        expect(foundExportStatement.length).toBeTruthy();
      });
      it(`should add 'default export' the specified class with multiple exports`, async () => {
        const contractName = 'Foo';
        const contract = `
        export class Bar extends SmartContract {};
        export class ${contractName} extends SmartContract {}`;
        const exportedContract = await addDefaultExportToContract(
          contractName,
          contract,
          ''
        );
        const foundExportStatement = exportedContract.match(
          new RegExp(
            `export default class ${contractName} extends SmartContract`,
            'gi'
          )
        );
        expect(foundExportStatement.length).toBeTruthy();
      });
      it(`should not add 'default export' to an invalid class`, async () => {
        const contract = `
        export class Bar extends SmartContract {};
        export class Foo extends SmartContract {}`;
        const exportedContract = await addDefaultExportToContract(
          'NotValidContract',
          contract,
          ''
        );
        const foundExportStatement = exportedContract.match(
          new RegExp(`export default class Foo extends SmartContract`, 'gi')
        );
        expect(foundExportStatement).toBeFalsy();
      });
    });
  });
});
