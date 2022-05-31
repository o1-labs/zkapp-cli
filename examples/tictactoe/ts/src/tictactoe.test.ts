import { TicTacToe } from './tictactoe';
import { createLocalBlockchain, makeMove, deploy } from './tictactoe-lib';
import {
  isReady,
  shutdown,
  Field,
  Bool,
  PrivateKey,
  PublicKey,
} from 'snarkyjs';

describe('tictactoe', () => {
  let player1: PrivateKey,
    player2: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey;

  beforeEach(async () => {
    await isReady;
    [player1, player2] = createLocalBlockchain();
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    return;
  });

  afterAll(async () => {
    setTimeout(shutdown, 0);
  });

  it('generates and deploys tictactoe', async () => {
    const zkAppInstance = new TicTacToe(zkAppAddress);
    await deploy(zkAppInstance, zkAppPrivateKey, player1);

    const board = zkAppInstance.board.get();
    expect(board).toEqual(Field.zero);
  });

  it('accepts a correct move', async () => {
    const zkAppInstance = new TicTacToe(zkAppAddress);
    await deploy(zkAppInstance, zkAppPrivateKey, player1);
    await makeMove(
      zkAppInstance,
      zkAppPrivateKey,
      player1,
      player1.toPublicKey(),
      player2.toPublicKey(),
      Field.zero,
      Field.zero
    );

    const nextPlayer = zkAppInstance.nextPlayer.get();
    expect(nextPlayer).toEqual(Bool(true));
  });
});
