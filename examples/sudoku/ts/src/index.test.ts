import {
  deploy,
  submitSolution,
  getZkAppState,
  createLocalBlockchain,
} from './sudoku-zkapp';
import { cloneSudoku, generateSudoku, solveSudoku } from './sudoku-lib';
import { isReady, shutdown, PrivateKey, PublicKey } from 'snarkyjs';

describe('sudoku', () => {
  let account: PrivateKey, zkAppAddress: PublicKey, zkAppPrivateKey: PrivateKey;
  beforeEach(async () => {
    await isReady;
    account = createLocalBlockchain();
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    return;
  });

  afterAll(async () => {
    setTimeout(async () => {
      await shutdown();
    }, 0);
  });

  it('generates and deploys sudoku', async () => {
    let sudoku = generateSudoku(0.5);
    await deploy(sudoku, account, zkAppAddress, zkAppPrivateKey);

    let state = await getZkAppState(zkAppAddress);
    expect(state).toBeDefined();
    expect(state.isSolved).toBe(false);
  });

  it('accepts a correct solution', async () => {
    let sudoku = generateSudoku(0.5);
    await deploy(sudoku, account, zkAppAddress, zkAppPrivateKey);

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

    let { isSolved } = await getZkAppState(zkAppAddress);
    expect(isSolved).toBe(true);
  });

  it('rejects an incorrect solution', async () => {
    let sudoku = generateSudoku(0.5);
    await deploy(sudoku, account, zkAppAddress, zkAppPrivateKey);

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

    let { isSolved } = await getZkAppState(zkAppAddress);
    expect(isSolved).toBe(false);
  });
});
