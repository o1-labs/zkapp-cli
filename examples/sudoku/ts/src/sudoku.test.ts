import { Sudoku, SudokuZkApp } from './sudoku';
import { cloneSudoku, generateSudoku, solveSudoku } from './sudoku-lib';
import {
  isReady,
  shutdown,
  PrivateKey,
  PublicKey,
  Mina,
  AccountUpdate,
} from 'snarkyjs';

describe('sudoku', () => {
  let zkAppInstance: SudokuZkApp,
    zkAppPrivateKey: PrivateKey,
    zkAppAddress: PublicKey,
    sudoku: number[][],
    account: PrivateKey;

  beforeEach(async () => {
    await isReady;
    let Local = Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    account = Local.testAccounts[0].privateKey;
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkAppInstance = new SudokuZkApp(zkAppAddress);
    sudoku = generateSudoku(0.5);
  });

  afterAll(() => {
    setTimeout(shutdown, 0);
  });

  it('accepts a correct solution', async () => {
    await deploy(zkAppInstance, zkAppPrivateKey, sudoku, account);

    let isSolved = zkAppInstance.isSolved.get().toBoolean();
    expect(isSolved).toBe(false);

    let solution = solveSudoku(sudoku);
    if (solution === undefined) throw Error('cannot happen');
    await submitSolution(sudoku, solution, account, zkAppAddress);

    isSolved = zkAppInstance.isSolved.get().toBoolean();
    expect(isSolved).toBe(true);
  });

  it('rejects an incorrect solution', async () => {
    await deploy(zkAppInstance, zkAppPrivateKey, sudoku, account);

    let solution = solveSudoku(sudoku);
    if (solution === undefined) throw Error('cannot happen');

    let noSolution = cloneSudoku(solution);
    noSolution[0][0] = (noSolution[0][0] % 9) + 1;

    await expect(() =>
      submitSolution(sudoku, noSolution, account, zkAppAddress)
    ).rejects.toThrow(/array contains the numbers 1...9/);

    let isSolved = zkAppInstance.isSolved.get().toBoolean();
    expect(isSolved).toBe(false);
  });
});

async function deploy(
  zkAppInstance: SudokuZkApp,
  zkAppPrivateKey: PrivateKey,
  sudoku: number[][],
  account: PrivateKey
) {
  let tx = await Mina.transaction(account, () => {
    AccountUpdate.fundNewAccount(account);
    let sudokuInstance = Sudoku.from(sudoku);
    zkAppInstance.deploy();
    zkAppInstance.update(sudokuInstance);
  });
  await tx.prove();
  await tx.sign([zkAppPrivateKey]).send();
}

async function submitSolution(
  sudoku: number[][],
  solution: number[][],
  account: PrivateKey,
  zkAppAddress: PublicKey
) {
  let tx = await Mina.transaction(account, () => {
    let zkApp = new SudokuZkApp(zkAppAddress);
    zkApp.submitSolution(Sudoku.from(sudoku), Sudoku.from(solution));
  });
  await tx.prove();
  await tx.send();
}
