/**
 * This file defines the `TicTacToe` smart contract and the helpers it needs.
 */

import {
  Field,
  State,
  PublicKey,
  SmartContract,
  state,
  method,
  Bool,
  Circuit,
  Signature,
  Permissions,
  DeployArgs,
} from 'snarkyjs';

class Optional<T> {
  isSome: Bool;
  value: T;

  constructor(isSome: Bool, value: T) {
    this.isSome = isSome;
    this.value = value;
  }
}

export class Board {
  board: Optional<Bool>[][];

  constructor(serializedBoard: Field) {
    const bits = serializedBoard.toBits();
    let board = [];
    for (let i = 0; i < 3; i++) {
      let row = [];
      for (let j = 0; j < 3; j++) {
        const isPlayed = bits[i * 3 + j];
        const player = bits[i * 3 + j + 9];
        row.push(new Optional(isPlayed, player));
      }
      board.push(row);
    }
    this.board = board;
  }

  serialize(): Field {
    let isPlayed = [];
    let player = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        isPlayed.push(this.board[i][j].isSome);
        player.push(this.board[i][j].value);
      }
    }
    return Field.ofBits(isPlayed.concat(player));
  }

  update(x: Field, y: Field, playerToken: Bool) {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        // is this the cell the player wants to play?
        const toUpdate = x.equals(new Field(i)).and(y.equals(new Field(j)));

        // make sure we can play there
        toUpdate.and(this.board[i][j].isSome).assertEquals(false);

        // copy the board (or update if this is the cell the player wants to play)
        this.board[i][j] = Circuit.if(
          toUpdate,
          new Optional(new Bool(true), playerToken),
          this.board[i][j]
        );
      }
    }
  }

  printState() {
    for (let i = 0; i < 3; i++) {
      let row = '| ';
      for (let j = 0; j < 3; j++) {
        let token = '_';
        if (this.board[i][j].isSome.toBoolean()) {
          token = this.board[i][j].value.toBoolean() ? 'X' : 'O';
        }

        row += token + ' | ';
      }
      console.log(row);
    }
    console.log('---\n');
  }

  checkWinner(): Bool {
    let won = new Bool(false);

    // check rows
    for (let i = 0; i < 3; i++) {
      let row = this.board[i][0].isSome;
      row = row.and(this.board[i][1].isSome);
      row = row.and(this.board[i][2].isSome);
      row = row.and(this.board[i][0].value.equals(this.board[i][1].value));
      row = row.and(this.board[i][1].value.equals(this.board[i][2].value));
      won = won.or(row);
    }

    // check cols
    for (let i = 0; i < 3; i++) {
      let col = this.board[0][i].isSome;
      col = col.and(this.board[1][i].isSome);
      col = col.and(this.board[2][i].isSome);
      col = col.and(this.board[0][i].value.equals(this.board[1][i].value));
      col = col.and(this.board[1][i].value.equals(this.board[2][i].value));
      won = won.or(col);
    }

    // check diagonals
    let diag1 = this.board[0][0].isSome;
    diag1 = diag1.and(this.board[1][1].isSome);
    diag1 = diag1.and(this.board[2][2].isSome);
    diag1 = diag1.and(this.board[0][0].value.equals(this.board[1][1].value));
    diag1 = diag1.and(this.board[1][1].value.equals(this.board[2][2].value));
    won = won.or(diag1);

    let diag2 = this.board[0][2].isSome;
    diag2 = diag2.and(this.board[1][1].isSome);
    diag2 = diag2.and(this.board[0][2].isSome);
    diag2 = diag2.and(this.board[0][2].value.equals(this.board[1][1].value));
    diag2 = diag2.and(this.board[1][1].value.equals(this.board[2][0].value));
    won = won.or(diag2);

    //
    return won;
  }
}

export class TicTacToe extends SmartContract {
  // The board is serialized as a single field element
  @state(Field) board = State<Field>();
  // false -> player 1 | true -> player 2
  @state(Bool) nextPlayer = State<Bool>();
  // defaults to false, set to true when a player wins
  @state(Bool) gameDone = State<Bool>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
  }

  @method init() {
    this.board.set(Field.zero);
    this.nextPlayer.set(new Bool(false)); // player 1 starts
    this.gameDone.set(new Bool(false));
  }

  // board:
  //  x  0  1  2
  // y +----------
  // 0 | x  x  x
  // 1 | x  x  x
  // 2 | x  x  x
  @method play(
    pubkey: PublicKey,
    signature: Signature,
    x: Field,
    y: Field,
    player1: PublicKey,
    player2: PublicKey
  ) {
    // 1. if the game is already finished, abort.
    const finished = this.gameDone.get();
    this.gameDone.assertEquals(finished); // precondition that links this.gameDone.get() to the actual on-chain state
    finished.assertEquals(false);

    // 2. ensure that we know the private key associated to the public key
    //    and that our public key is known to the zkApp

    // ensure player owns the associated private key
    signature.verify(pubkey, [x, y]).assertEquals(true);

    // ensure player is valid
    Bool.or(pubkey.equals(player1), pubkey.equals(player2)).assertEquals(true);

    // 3. Make sure that its our turn,
    //    and set the state for the next player

    // get player token
    const player = pubkey.equals(player2); // player 1 is false, player 2 is true

    // ensure its their turn
    const nextPlayer = this.nextPlayer.get();
    this.nextPlayer.assertEquals(nextPlayer); // precondition that links this.nextPlayer.get() to the actual on-chain state
    nextPlayer.assertEquals(player);

    // set the next player
    this.nextPlayer.set(player.not());

    // 4. get and deserialize the board
    this.board.assertEquals(this.board.get()); // precondition that links this.board.get() to the actual on-chain state
    let board = new Board(this.board.get());

    // 5. update the board (and the state) with our move
    x.equals(Field.zero)
      .or(x.equals(Field.one))
      .or(x.equals(new Field(2)))
      .assertEquals(true);
    y.equals(Field.zero)
      .or(y.equals(Field.one))
      .or(y.equals(new Field(2)))
      .assertEquals(true);

    board.update(x, y, player);
    this.board.set(board.serialize());

    // 6. did I just win? If so, update the state as well
    const won = board.checkWinner();
    this.gameDone.set(won);
  }
}
