import {
  Field,
  State,
  PublicKey,
  SmartContract,
  state,
  method,
  PrivateKey,
  UInt64,
  Int64,
  Bool,
  Circuit,
  Mina,
  Party,
  shutdown,
  Optional,
  Signature,
  isReady,
} from 'snarkyjs';

class Board {
  board: Optional<Bool>[][];

  constructor(serialized_board: Field) {
    const bits = serialized_board.toBits();
    let board = [];
    for (let i = 0; i < 3; i++) {
      let row = [];
      for (let j = 0; j < 3; j++) {
        const is_played = bits[i * 3 + j];
        const player = bits[i * 3 + j + 9];
        row.push(new Optional(is_played, player));
      }
      board.push(row);
    }
    this.board = board;
  }

  serialize(): Field {
    let is_played = [];
    let player = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        is_played.push(this.board[i][j].isSome);
        player.push(this.board[i][j].value);
      }
    }
    return Field.ofBits(is_played.concat(player));
  }

  update(x: Field, y: Field, player_token: Bool) {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        // is this the cell the player wants to play?
        const to_update = Circuit.if(
          x.equals(new Field(i)).and(y.equals(new Field(j))),
          new Bool(true),
          new Bool(false)
        );

        // make sure we can play there
        Circuit.if(
          to_update,
          this.board[i][j].isSome,
          new Bool(false)
        ).assertEquals(false);

        // copy the board (or update if this is the cell the player wants to play)
        this.board[i][j] = Circuit.if(
          to_update,
          new Optional(new Bool(true), player_token),
          this.board[i][j]
        );
      }
    }
  }

  print_state() {
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

  check_winner(): Bool {
    let won = new Bool(false);

    // check rows
    for (let i = 0; i < 3; i++) {
      let row = this.board[i][0].isSome;
      row = row.and(this.board[i][1].isSome);
      row = row.and(this.board[i][2].isSome);
      row = row.and(this.board[i][0].value.equals(this.board[i][1].value));
      row = row.and(this.board[i][1].value.equals(this.board[i][2].value));
      won = Circuit.if(row, new Bool(true), won);
    }

    // check cols
    for (let i = 0; i < 3; i++) {
      let col = this.board[0][i].isSome;
      col = col.and(this.board[1][i].isSome);
      col = col.and(this.board[2][i].isSome);
      col = col.and(this.board[0][i].value.equals(this.board[1][i].value));
      col = col.and(this.board[1][i].value.equals(this.board[2][i].value));
      won = Circuit.if(col, new Bool(true), won);
    }

    // check diagonals
    let diag1 = this.board[0][0].isSome;
    diag1 = diag1.and(this.board[1][1].isSome);
    diag1 = diag1.and(this.board[2][2].isSome);
    diag1 = diag1.and(this.board[0][0].value.equals(this.board[1][1].value));
    diag1 = diag1.and(this.board[1][1].value.equals(this.board[2][2].value));
    won = Circuit.if(diag1, new Bool(true), won);

    let diag2 = this.board[0][2].isSome;
    diag2 = diag2.and(this.board[1][1].isSome);
    diag2 = diag2.and(this.board[0][2].isSome);
    diag2 = diag2.and(this.board[0][2].value.equals(this.board[1][1].value));
    diag2 = diag2.and(this.board[1][1].value.equals(this.board[2][0].value));
    won = Circuit.if(diag2, new Bool(true), won);

    //
    return won;
  }
}

class TicTacToe extends SmartContract {
  // The board is serialized as a single field element
  @state(Field) board: State<Field>;
  // player 1's public key
  @state(PublicKey) player1: State<PublicKey>;
  // player 2's public key
  @state(PublicKey) player2: State<PublicKey>;
  // false -> player 1 | true -> player 2
  @state(Bool) nextPlayer: State<Bool>;
  // defaults to false, set to true when a player wins
  @state(Bool) gameDone: State<Bool>;

  // initialization
  constructor(
    initialBalance: UInt64,
    address: PublicKey,
    player1: PublicKey,
    player2: PublicKey
  ) {
    super(address);
    this.balance.addInPlace(initialBalance);
    this.board = State.init(Field.zero);
    this.nextPlayer = State.init(new Bool(false)); // player 1 starts
    this.gameDone = State.init(new Bool(false));

    // set the public key of the players
    this.player1 = State.init(player1);
    this.player2 = State.init(player2);
  }

  // board:
  //  x  0  1  2
  // y +----------
  // 0 | x  x  x
  // 1 | x  x  x
  // 2 | x  x  x
  @method async play(
    pubkey: PublicKey,
    signature: Signature,
    x: Field,
    y: Field
  ) {
    // 1. if the game is already finished, abort.
    const finished = await this.gameDone.get();
    finished.assertEquals(false);

    // 2. ensure that we know the private key associated to the public key
    //    and that our public key is known to the snapp

    // ensure player owns the associated private key
    signature.verify(pubkey, [x, y]).assertEquals(true);

    // ensure player is valid
    const player1 = await this.player1.get();
    const player2 = await this.player2.get();
    Bool.or(pubkey.equals(player1), pubkey.equals(player2)).assertEquals(true);

    // 3. Make sure that its our turn,
    //    and set the state for the next player

    // get player token
    const player = Circuit.if(
      pubkey.equals(player1),
      new Bool(false),
      new Bool(true)
    );

    // ensure its their turn
    const nextPlayer = await this.nextPlayer.get();
    nextPlayer.assertEquals(player);

    // set the next player
    this.nextPlayer.set(player.not());

    // 4. get and deserialize the board
    let board = new Board(await this.board.get());

    // 5. update the board (and the state) with our move
    board.update(x, y, player);
    this.board.set(board.serialize());

    // 6. did I just win? If so, update the state as well
    const won = board.check_winner();
    this.gameDone.set(won);
  }
}

export async function main() {
  await isReady;

  const Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);

  const player1 = Local.testAccounts[0].privateKey;
  const player2 = Local.testAccounts[1].privateKey;

  const snappPrivkey = PrivateKey.random();
  const snappPubkey = snappPrivkey.toPublicKey();

  // Create a new instance of the contract
  console.log('\n\n====== DEPLOYING ======\n\n');
  let snappInstance: TicTacToe;
  await Mina.transaction(player1, async () => {
    // player2 sends 1000000000 to the new snapp account
    const amount = UInt64.fromNumber(1000000000);
    const p = await Party.createSigned(player2);
    p.body.delta = Int64.fromUnsigned(amount).neg();

    snappInstance = new TicTacToe(
      amount,
      snappPubkey,
      player1.toPublicKey(),
      player2.toPublicKey()
    );
  })
    .send()
    .wait();

  // initial state
  let b = await Mina.getAccount(snappPubkey);
  console.log('initial state of the snapp');
  for (const i in [0, 1, 2, 3, 4, 5, 6, 7]) {
    console.log('state', i, ':', b.snapp.appState[i].toString());
  }

  console.log('\ninitial board');
  new Board(b.snapp.appState[0]).print_state();

  // play
  console.log('\n\n====== FIRST MOVE ======\n\n');
  await Mina.transaction(player1, async () => {
    const x = Field.zero;
    const y = Field.zero;
    const signature = Signature.create(player1, [x, y]);
    snappInstance.play(
      player1.toPublicKey(),
      signature,
      Field.zero,
      Field.zero
    );
  })
    .send()
    .wait();

  // debug
  b = await Mina.getAccount(snappPubkey);
  new Board(b.snapp.appState[0]).print_state();

  // play
  console.log('\n\n====== SECOND MOVE ======\n\n');
  const two = new Field(2);
  await Mina.transaction(player1, async () => {
    const x = Field.one;
    const y = Field.zero;
    const signature = Signature.create(player2, [x, y]);
    snappInstance
      .play(player2.toPublicKey(), signature, Field.one, Field.zero)
      .catch((e) => console.log(e));
  })
    .send()
    .wait();

  // debug
  b = await Mina.getAccount(snappPubkey);
  new Board(b.snapp.appState[0]).print_state();

  // play
  console.log('\n\n====== THIRD MOVE ======\n\n');
  await Mina.transaction(player1, async () => {
    const x = Field.one;
    const y = Field.one;
    const signature = Signature.create(player1, [x, y]);
    snappInstance
      .play(player1.toPublicKey(), signature, Field.one, Field.one)
      .catch((e) => console.log(e));
  })
    .send()
    .wait();

  // debug
  b = await Mina.getAccount(snappPubkey);
  new Board(b.snapp.appState[0]).print_state();

  // play
  console.log('\n\n====== FOURTH MOVE ======\n\n');
  await Mina.transaction(player2, async () => {
    const x = two;
    const y = Field.one;
    const signature = Signature.create(player2, [x, y]);
    snappInstance
      .play(player2.toPublicKey(), signature, two, Field.one)
      .catch((e) => console.log(e));
  })
    .send()
    .wait();

  // debug
  b = await Mina.getAccount(snappPubkey);
  new Board(b.snapp.appState[0]).print_state();

  // play
  console.log('\n\n====== FIFTH MOVE ======\n\n');
  await Mina.transaction(player1, async () => {
    const x = two;
    const y = two;
    const signature = Signature.create(player1, [x, y]);
    snappInstance
      .play(player1.toPublicKey(), signature, two, two)
      .catch((e) => console.log(e));
  })
    .send()
    .wait();

  // debug
  b = await Mina.getAccount(snappPubkey);
  new Board(b.snapp.appState[0]).print_state();
  console.log('did someone win?', b.snapp.appState[6].toString());

  //
  shutdown();
}

main();
