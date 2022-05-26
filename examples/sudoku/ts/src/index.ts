/**
 * This file specifies how to run the `SudokuZkApp` smart contract locally using the `Mina.LocalBlockchain()` method.
 * The `Mina.LocalBlockchain()` method specifes a ledger of accounts and contains logic for updating the ledger.
 *
 * Please note that this deployment is local and does not deploy to a live network.
 * If you wish to deploy to a live network, please use the zkapp-cli to deploy.
 *
 * To run locally:
 * Build the project: `$ npm run build`
 * Run with node:     `$ node build/src/index.js`.
 */
import { SudokuZkApp, Sudoku } from './sudoku-zkapp.js';
import { cloneSudoku, generateSudoku, solveSudoku } from './sudoku-lib.js';
import {
  Field,
  PrivateKey,
  Mina,
  shutdown,
  Bool,
  Party,
  Permissions,
} from 'snarkyjs';

async function main() {
  // setup
  const Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);
  const account1 = Local.testAccounts[0].privateKey;
  let sudoku = generateSudoku(0.5);
  const zkAppPrivateKey = PrivateKey.random();
  let zkAppAddress = zkAppPrivateKey.toPublicKey();

  // create an instance of the smart contract
  console.log('Deploying Sudoku...');

  let zkAppInstance = new SudokuZkApp(zkAppAddress);
  let sudokuInstance = new Sudoku(sudoku);

  let txn = await Local.transaction(account1, () => {
    Party.fundNewAccount(account1);
    zkAppInstance.deploy({ zkappKey: zkAppPrivateKey });
    zkAppInstance.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });

    zkAppInstance.sudokuHash.set(sudokuInstance.hash());
    zkAppInstance.isSolved.set(Bool(false));
  });

  await txn.send().wait();

  console.log('Is the sudoku solved?', (await getZkAppState()).isSolved);

  let solution = solveSudoku(sudoku);
  if (solution === undefined) throw Error('cannot happen');

  // submit a wrong solution
  let noSolution = cloneSudoku(solution);
  noSolution[0][0] = (noSolution[0][0] % 9) + 1;

  console.log('Submitting wrong solution...');
  try {
    await submitSolution(sudoku, noSolution);
  } catch {
    console.log('There was an error submitting the solution');
  }
  console.log('Is the sudoku solved?', (await getZkAppState()).isSolved);

  // submit the actual solution
  console.log('Submitting solution...');
  await submitSolution(sudoku, solution);
  console.log('Is the sudoku solved?', (await getZkAppState()).isSolved);

  // cleanup
  shutdown();

  // helpers
  async function submitSolution(sudoku: number[][], solution: number[][]) {
    let tx = await Mina.transaction(account1, () => {
      let zkApp = new SudokuZkApp(zkAppAddress);
      zkApp.submitSolution(new Sudoku(sudoku), new Sudoku(solution));
      zkApp.self.sign(zkAppPrivateKey);
      zkApp.self.body.incrementNonce = Bool(true);
    });
    try {
      await tx.send().wait();
      return true;
    } catch (err) {
      return false;
    }
  }

  async function getZkAppState() {
    let zkAppState = Mina.getAccount(zkAppAddress).zkapp?.appState;
    if (zkAppState === undefined)
      throw Error('Account does not have zkApp state.');
    let sudokuHash = fieldToHex(zkAppState?.[0]);
    let isSolved = zkAppState[1].equals(true).toBoolean();
    return { sudokuHash, isSolved };
  }

  function fieldToHex(field: Field) {
    return BigInt(field.toString()).toString(16);
  }
}

main();
