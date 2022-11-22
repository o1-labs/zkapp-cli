import {
  Field,
  PrivateKey,
  PublicKey,
  Mina,
  AccountUpdate,
  Signature,
} from 'snarkyjs';
import { TicTacToe } from './tictactoe.js';

export function createLocalBlockchain(): PrivateKey[] {
  let Local = Mina.LocalBlockchain({ proofsEnabled: false });
  Mina.setActiveInstance(Local);
  return [Local.testAccounts[0].privateKey, Local.testAccounts[1].privateKey];
}

export async function deploy(
  zkAppInstance: TicTacToe,
  zkAppPrivatekey: PrivateKey,
  deployer: PrivateKey,
  player1: PublicKey,
  player2: PublicKey
) {
  const txn = await Mina.transaction(deployer, () => {
    AccountUpdate.fundNewAccount(deployer);
    zkAppInstance.deploy();
    zkAppInstance.startGame(player1, player2);
  });
  await txn.prove();
  await txn.sign([zkAppPrivatekey]).send();
}

export async function makeMove(
  zkAppInstance: TicTacToe,
  currentPlayer: PrivateKey,
  x: Field,
  y: Field
) {
  const txn = await Mina.transaction(currentPlayer, async () => {
    const signature = Signature.create(currentPlayer, [x, y]);
    zkAppInstance.play(currentPlayer.toPublicKey(), signature, x, y);
  });
  await txn.prove();
  await txn.send();
}
