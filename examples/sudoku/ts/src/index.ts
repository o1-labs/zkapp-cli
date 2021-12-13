import { deploy, submitSolution, getSnappState } from './sudoku-snapp';
import { cloneSudoku, generateSudoku, solveSudoku } from './sudoku-lib';

let sudoku = generateSudoku(0.5);

console.log('Deploying Sudoku...');
await deploy(sudoku);
console.log('Is the sudoku solved?', (await getSnappState()).isSolved);

let solution = solveSudoku(sudoku);

// submit a wrong solution
let noSolution = cloneSudoku(solution);
noSolution[0][0] = (noSolution[0][0] % 9) + 1;

console.log('Submitting solution...');
await submitSolution(noSolution);
console.log('Is the sudoku solved?', (await getSnappState()).isSolved);

// submit the actual solution
console.log('Submitting solution...');
await submitSolution(solution);
console.log('Is the sudoku solved?', (await getSnappState()).isSolved);
