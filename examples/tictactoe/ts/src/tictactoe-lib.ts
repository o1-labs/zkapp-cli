import { Field, PrivateKey, PublicKey, Mina, Party, Signature } from 'snarkyjs';
import { TicTacToe } from './tictactoe.js';

export function createLocalBlockchain(): PrivateKey[] {
  let Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);
  return [Local.testAccounts[0].privateKey, Local.testAccounts[1].privateKey];
}

export async function deploy(
  zkAppInstance: TicTacToe,
  zkAppPrivkey: PrivateKey,
  deployer: PrivateKey
) {
  const txn = await Mina.transaction(deployer, () => {
    Party.fundNewAccount(deployer);
    zkAppInstance.deploy({ zkappKey: zkAppPrivkey });
    zkAppInstance.init();
  });
  await txn.send().wait();
}

export async function makeMove(
  zkAppInstance: TicTacToe,
  zkAppPrivkey: PrivateKey,
  currentPlayer: PrivateKey,
  player1Public: PublicKey,
  player2Public: PublicKey,
  x: Field,
  y: Field
) {
  const txn = await Mina.transaction(currentPlayer, async () => {
    const signature = Signature.create(currentPlayer, [x, y]);
    zkAppInstance.play(
      currentPlayer.toPublicKey(),
      signature,
      x,
      y,
      player1Public,
      player2Public
    );
    zkAppInstance.sign(zkAppPrivkey);
  });
  await txn.send().wait();
}
