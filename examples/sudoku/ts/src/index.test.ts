import { deploy, submitSolution, getSnappState } from './sudoku-snapp';
import { cloneSudoku, generateSudoku, solveSudoku } from './sudoku-lib';
import { shutdown } from 'snarkyjs';

describe('sudoku', () => {
  afterAll(async () => {
    await shutdown();
  });

  it('generates and deploys sudoku', async () => {
    let sudoku = generateSudoku(0.5);
    await deploy(sudoku);

    let state = await getSnappState();
    expect(state).toBeDefined();
    expect(state.isSolved).toBe(false);
  });

  it('accepts a correct solution', async () => {
    let sudoku = generateSudoku(0.5);
    await deploy(sudoku);

    let solution = solveSudoku(sudoku);
    if (solution === undefined) throw Error('cannot happen');
    let accepted = await submitSolution(solution);
    expect(accepted).toBe(true);

    let { isSolved } = await getSnappState();
    expect(isSolved).toBe(true);
  });

  it('rejects an incorrect solution', async () => {
    let sudoku = generateSudoku(0.5);
    await deploy(sudoku);

    let solution = solveSudoku(sudoku);
    if (solution === undefined) throw Error('cannot happen');

    let noSolution = cloneSudoku(solution);
    noSolution[0][0] = (noSolution[0][0] % 9) + 1;

    let accepted = await submitSolution(noSolution);
    expect(accepted).toBe(false);

    let { isSolved } = await getSnappState();
    expect(isSolved).toBe(false);
  });
});
