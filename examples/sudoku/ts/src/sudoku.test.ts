import {
  deploy,
  submitSolution,
  getZkAppState,
  createLocalBlockchain,
  SudokuZkApp,
} from './sudoku';
import { cloneSudoku, generateSudoku, solveSudoku } from './sudoku-lib';
import { isReady, shutdown, PrivateKey, PublicKey } from 'snarkyjs';

describe('sudoku', () => {
  let zkAppInstance: SudokuZkApp,
    zkAppPrivateKey: PrivateKey,
    zkAppAddress: PublicKey,
    sudoku: number[][],
    account: PrivateKey;

  beforeEach(async () => {
    await isReady;
    account = createLocalBlockchain();
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkAppInstance = new SudokuZkApp(zkAppAddress);
    sudoku = generateSudoku(0.5);
    return;
  });

  afterAll(async () => {
    setTimeout(shutdown, 0);
  });

  it('generates and deploys sudoku', async () => {
    await deploy(zkAppInstance, zkAppPrivateKey, sudoku, account);

    let state = getZkAppState(zkAppInstance);
    expect(state).toBeDefined();
    expect(state.isSolved).toBe(false);
  });

  it('accepts a correct solution', async () => {
    await deploy(zkAppInstance, zkAppPrivateKey, sudoku, account);

    let state = getZkAppState(zkAppInstance);
    expect(state).toBeDefined();
    expect(state.isSolved).toBe(false);

    let solution = solveSudoku(sudoku);
    if (solution === undefined) throw Error('cannot happen');
    let accepted = await submitSolution(
      sudoku,
      solution,
      account,
      zkAppAddress,
      zkAppPrivateKey
    );
    expect(accepted).toBe(true);

    let { isSolved } = getZkAppState(zkAppInstance);
    expect(isSolved).toBe(true);
  });

  it('rejects an incorrect solution', async () => {
    await deploy(zkAppInstance, zkAppPrivateKey, sudoku, account);

    let solution = solveSudoku(sudoku);
    if (solution === undefined) throw Error('cannot happen');

    let noSolution = cloneSudoku(solution);
    noSolution[0][0] = (noSolution[0][0] % 9) + 1;

    expect.assertions(1);
    try {
      await submitSolution(
        sudoku,
        noSolution,
        account,
        zkAppAddress,
        zkAppPrivateKey
      );
    } catch (e) {
      // A row, column  or 3x3 square will not have full range 1-9
      // This will cause an assert.
    }

    let { isSolved } = await getZkAppState(zkAppInstance);
    expect(isSolved).toBe(false);
  });
});
