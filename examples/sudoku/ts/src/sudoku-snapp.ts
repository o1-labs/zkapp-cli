import {
  matrixProp,
  CircuitValue,
  Field,
  SmartContract,
  PublicKey,
  method,
  PrivateKey,
  Mina,
  Bool,
  state,
  State,
  isReady,
  Poseidon,
  UInt64,
  Party,
} from 'snarkyjs';

export { deploy, submitSolution, getSnappState };

await isReady;

class Sudoku extends CircuitValue {
  @matrixProp(Field, 9, 9) value: Field[][];

  constructor(value: number[][]) {
    super();
    this.value = value.map((row) => row.map(Field));
  }

  hash() {
    return Poseidon.hash(this.value.flat());
  }
}

class SudokuSnapp extends SmartContract {
  sudoku: Sudoku;
  @state(Field) sudokuHash: State<Field>;
  @state(Bool) isSolved: State<Bool>;

  constructor(address: PublicKey, initialBalance: UInt64, sudoku: Sudoku) {
    super(address);
    this.balance.addInPlace(initialBalance);

    this.sudoku = sudoku;
    this.sudokuHash = State.init(this.sudoku.hash());
    this.isSolved = State.init(Bool(false));
  }

  @method async submitSolution(solutionInstance: Sudoku) {
    let sudoku = this.sudoku.value;
    let solution = solutionInstance.value;

    // first, we check that the passed solution is a valid sudoku

    // define helpers
    let range9 = Array.from({ length: 9 }, (_, i) => i);
    let oneTo9 = range9.map((i) => Field(i + 1));

    function assertHas1To9(array: Field[]) {
      oneTo9
        .map((k) => range9.map((i) => array[i].equals(k)).reduce(Bool.or))
        .reduce(Bool.and)
        .assertEquals(true);
    }

    // check all rows
    for (let i = 0; i < 9; i++) {
      let row = solution[i];
      assertHas1To9(row);
    }
    // check all columns
    for (let j = 0; j < 9; j++) {
      let column = solution.map((row) => row[j]);
      assertHas1To9(column);
    }
    // check 3x3 squares
    for (let k = 0; k < 9; k++) {
      let [i0, j0] = divmod(k, 3);
      let square = range9.map((m) => {
        let [i1, j1] = divmod(m, 3);
        return solution[3 * i0 + i1][3 * j0 + j1];
      });
      assertHas1To9(square);
    }

    // next, we check that the solution extends the initial sudoku
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        let cell = sudoku[i][j];
        let solutionCell = solution[i][j];
        // either the sudoku has nothing in it (indicated by a cell value of 0),
        // or it is equal to the solution
        Bool.or(cell.equals(0), cell.equals(solutionCell)).assertEquals(true);
      }
    }

    // finally, we check that the sudoku is the one that was originally deployed
    let sudokuHash = await this.sudokuHash.get(); // get the hash from the blockchain
    this.sudoku.hash().assertEquals(sudokuHash);

    // all checks passed => the sudoku is solved!
    this.isSolved.set(Bool(true));
  }
}

// setup
const Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);
const account1 = Local.testAccounts[0].privateKey;
const account2 = Local.testAccounts[1].privateKey;

let snapp: SudokuSnapp;
let isDeploying = false;
let snappAddress: PublicKey;

async function deploy(sudoku: number[][]) {
  if (isDeploying) return;
  isDeploying = true;
  const snappPrivkey = PrivateKey.random();
  snappAddress = snappPrivkey.toPublicKey();

  let tx = Mina.transaction(account1, async () => {
    const initialBalance = UInt64.fromNumber(1000000);
    const p = await Party.createSigned(account2);
    p.balance.subInPlace(initialBalance);
    snapp = new SudokuSnapp(snappAddress, initialBalance, new Sudoku(sudoku));
  });
  await tx.send().wait();

  isDeploying = false;
}

async function submitSolution(solution: number[][]) {
  let tx = Mina.transaction(account2, async () => {
    await snapp.submitSolution(new Sudoku(solution));
  });
  try {
    await tx.send().wait();
    return true;
  } catch (err) {
    return false;
  }
}

async function getSnappState() {
  let snappState = (await Mina.getAccount(snappAddress)).snapp.appState;
  let sudokuHash = fieldToHex(snappState[0]);
  let isSolved = snappState[1].equals(true).toBoolean();
  return { sudokuHash, isSolved };
}

// helpers
function divmod(k: number, n: number) {
  let q = Math.floor(k / n);
  return [q, k - q * n];
}

function fieldToHex(field: Field) {
  return BigInt(field.toString()).toString(16);
}
