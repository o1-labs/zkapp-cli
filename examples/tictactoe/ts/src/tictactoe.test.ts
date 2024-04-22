import { TicTacToe } from './tictactoe';
import {
  Field,
  Bool,
  PrivateKey,
  PublicKey,
  Mina,
  AccountUpdate,
  Signature,
} from 'o1js';

describe('tictactoe', () => {
  let player1: Mina.TestPublicKey,
    player1Key: PrivateKey,
    player2: Mina.TestPublicKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey;

  beforeEach(async () => {
    let Local = await Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);

    [player1, player2] = Local.testAccounts;
    player1Key = player1.key;

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
  });

  it('generates and deploys tictactoe', async () => {
    const zkApp = new TicTacToe(zkAppAddress);
    const txn = await Mina.transaction(player1, async () => {
      AccountUpdate.fundNewAccount(player1);
      await zkApp.deploy();
      await zkApp.startGame(player1, player2);
    });
    await txn.prove();
    await txn.sign([zkAppPrivateKey, player1Key]).send();
    const board = zkApp.board.get();
    expect(board).toEqual(Field(0));
  });

  it('deploys tictactoe & accepts a correct move', async () => {
    const zkApp = new TicTacToe(zkAppAddress);

    // deploy
    let txn = await Mina.transaction(player1, async () => {
      AccountUpdate.fundNewAccount(player1);
      await zkApp.deploy();
      await zkApp.startGame(player1, player2);
    });
    await txn.prove();
    await txn.sign([zkAppPrivateKey, player1Key]).send();

    // move
    const [x, y] = [Field(0), Field(0)];
    const signature = Signature.create(player1Key, [x, y]);
    txn = await Mina.transaction(player1, async () => {
      zkApp.play(player1, signature, x, y);
    });
    await txn.prove();
    await txn.sign([player1Key]).send();

    // check next player
    let isNextPlayer2 = zkApp.nextIsPlayer2.get();
    expect(isNextPlayer2).toEqual(Bool(true));
  });
});
