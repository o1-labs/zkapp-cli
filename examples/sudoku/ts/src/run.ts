/**
 * This file specifies how to run the `SudokuZkApp` smart contract locally using the `Mina.LocalBlockchain()` method.
 * The `Mina.LocalBlockchain()` method specifies a ledger of accounts and contains logic for updating the ledger.
 *
 * Please note that this deployment is local and does not deploy to a live network.
 * If you wish to deploy to a live network, please use the zkapp-cli to deploy.
 *
 * To run locally:
 * Build the project: `$ npm run build`
 * Run with node:     `$ node build/src/run.js`.
 */
import {
  deploy,
  submitSolution,
  getZkAppState,
  createLocalBlockchain,
  SudokuZkApp,
} from './sudoku.js';
import { cloneSudoku, generateSudoku, solveSudoku } from './sudoku-lib.js';
import { PrivateKey, shutdown } from 'snarkyjs';

// setup
const account = createLocalBlockchain();
const sudoku = generateSudoku(0.5);
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
// create an instance of the smart contract
const zkAppInstance = new SudokuZkApp(zkAppAddress);

console.log('Deploying Sudoku...');
await deploy(zkAppInstance, zkAppPrivateKey, sudoku, account);

console.log('Is the sudoku solved?', getZkAppState(zkAppInstance).isSolved);

let solution = solveSudoku(sudoku);
if (solution === undefined) throw Error('cannot happen');

// submit a wrong solution
let noSolution = cloneSudoku(solution);
noSolution[0][0] = (noSolution[0][0] % 9) + 1;

console.log('Submitting wrong solution...');
try {
  await submitSolution(
    sudoku,
    noSolution,
    account,
    zkAppAddress,
    zkAppPrivateKey
  );
} catch {
  console.log('There was an error submitting the solution');
}
console.log('Is the sudoku solved?', getZkAppState(zkAppInstance).isSolved);

// submit the actual solution
console.log('Submitting solution...');
await submitSolution(sudoku, solution, account, zkAppAddress, zkAppPrivateKey);
console.log('Is the sudoku solved?', getZkAppState(zkAppInstance).isSolved);

// cleanup
await shutdown();
