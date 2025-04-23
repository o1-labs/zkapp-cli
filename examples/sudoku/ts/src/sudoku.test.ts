import { Sudoku, SudokuZkApp } from './sudoku.js';
import { cloneSudoku, generateSudoku, solveSudoku } from './sudoku-lib.js';
import { PrivateKey, PublicKey, Mina, AccountUpdate } from 'o1js';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

describe('sudoku', () => {
  let zkApp: SudokuZkApp,
    zkAppPrivateKey: PrivateKey,
    zkAppAddress: PublicKey,
    sudoku: number[][],
    sender: Mina.TestPublicKey,
    senderKey: PrivateKey;

  beforeEach(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    sender = Local.testAccounts[0];
    senderKey = sender.key;
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new SudokuZkApp(zkAppAddress);
    sudoku = generateSudoku(0.5);
  });

  it('accepts a correct solution', async () => {
    await deploy(zkApp, zkAppPrivateKey, sudoku, sender, senderKey);

    let isSolved = zkApp.isSolved.get().toBoolean();
    assert.strictEqual(isSolved, false);

    const solution = solveSudoku(sudoku);
    if (solution === undefined) throw Error('cannot happen');
    const tx = await Mina.transaction(sender, async () => {
      const zkApp = new SudokuZkApp(zkAppAddress);
      await zkApp.submitSolution(Sudoku.from(sudoku), Sudoku.from(solution!));
    });
    await tx.prove();
    await tx.sign([senderKey]).send();

    isSolved = zkApp.isSolved.get().toBoolean();
    assert.strictEqual(isSolved, true);
  });

  it('rejects an incorrect solution', async () => {
    await deploy(zkApp, zkAppPrivateKey, sudoku, sender, senderKey);

    const solution = solveSudoku(sudoku);
    if (solution === undefined) throw Error('cannot happen');

    const noSolution = cloneSudoku(solution);
    noSolution[0][0] = (noSolution[0][0] % 9) + 1;

    await assert.rejects(async () => {
      const tx = await Mina.transaction(sender, async () => {
        const zkApp = new SudokuZkApp(zkAppAddress);
        await zkApp.submitSolution(
          Sudoku.from(sudoku),
          Sudoku.from(noSolution)
        );
      });
      await tx.prove();
      await tx.sign([senderKey]).send();
    }, /array contains the numbers 1...9/);

    const isSolved = zkApp.isSolved.get().toBoolean();
    assert.strictEqual(isSolved, false);
  });
});

async function deploy(
  zkApp: SudokuZkApp,
  zkAppPrivateKey: PrivateKey,
  sudoku: number[][],
  sender: PublicKey,
  senderKey: PrivateKey
) {
  const tx = await Mina.transaction(sender, async () => {
    AccountUpdate.fundNewAccount(sender);
    await zkApp.deploy();
    await zkApp.update(Sudoku.from(sudoku));
  });
  await tx.prove();
  // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
  await tx.sign([zkAppPrivateKey, senderKey]).send();
}
