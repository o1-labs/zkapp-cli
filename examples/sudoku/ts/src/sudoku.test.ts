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
  let zkApp: SudokuZkApp,
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
    zkApp = new SudokuZkApp(zkAppAddress);
    sudoku = generateSudoku(0.5);
  });

  afterAll(() => {
    setTimeout(shutdown, 0);
  });

  it('accepts a correct solution', async () => {
    await deploy(zkApp, zkAppPrivateKey, sudoku, account);

    let isSolved = zkApp.isSolved.get().toBoolean();
    expect(isSolved).toBe(false);

    let solution = solveSudoku(sudoku);
    if (solution === undefined) throw Error('cannot happen');
    let tx = await Mina.transaction(account, () => {
      let zkApp = new SudokuZkApp(zkAppAddress);
      zkApp.submitSolution(Sudoku.from(sudoku), Sudoku.from(solution!));
    });
    await tx.prove();
    await tx.send();

    isSolved = zkApp.isSolved.get().toBoolean();
    expect(isSolved).toBe(true);
  });

  it('rejects an incorrect solution', async () => {
    await deploy(zkApp, zkAppPrivateKey, sudoku, account);

    let solution = solveSudoku(sudoku);
    if (solution === undefined) throw Error('cannot happen');

    let noSolution = cloneSudoku(solution);
    noSolution[0][0] = (noSolution[0][0] % 9) + 1;

    await expect(async () => {
      let tx = await Mina.transaction(account, () => {
        let zkApp = new SudokuZkApp(zkAppAddress);
        zkApp.submitSolution(Sudoku.from(sudoku), Sudoku.from(noSolution));
      });
      await tx.prove();
      await tx.send();
    }).rejects.toThrow(/array contains the numbers 1...9/);

    let isSolved = zkApp.isSolved.get().toBoolean();
    expect(isSolved).toBe(false);
  });
});

async function deploy(
  zkApp: SudokuZkApp,
  zkAppPrivateKey: PrivateKey,
  sudoku: number[][],
  account: PrivateKey
) {
  let tx = await Mina.transaction(account, () => {
    AccountUpdate.fundNewAccount(account);
    zkApp.deploy();
    zkApp.update(Sudoku.from(sudoku));
  });
  await tx.prove();
  // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
  await tx.sign([zkAppPrivateKey]).send();
}
