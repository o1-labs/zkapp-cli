/**
 * This file specifies how to run the `TicTacToe` smart contract locally using the `Mina.LocalBlockchain()` method.
 * The `Mina.LocalBlockchain()` method specifies a ledger of accounts and contains logic for updating the ledger.
 *
 * Please note that this deployment is local and does not deploy to a live network.
 * If you wish to deploy to a live network, please use the zkapp-cli to deploy.
 *
 * To run locally:
 * Build the project: `$ npm run build`
 * Run with node:     `$ node build/src/index.js`.
 */

import {
  Field,
  PrivateKey,
  Bool,
  Mina,
  Party,
  shutdown,
  Signature,
  isReady,
} from 'snarkyjs';
import { TicTacToe, Board } from './tictactoe.js';

async function main() {
  await isReady;

  const Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);

  const player1 = Local.testAccounts[0].privateKey;
  const player2 = Local.testAccounts[1].privateKey;
  const player1Public = player1.toPublicKey();
  const player2Public = player2.toPublicKey();

  const zkAppPrivkey = PrivateKey.random();
  const zkAppPubkey = zkAppPrivkey.toPublicKey();

  // Create a new instance of the contract
  console.log('\n\n====== DEPLOYING ======\n\n');
  let zkAppInstance = new TicTacToe(zkAppPubkey);

  let txn = await Local.transaction(player1, () => {
    Party.fundNewAccount(player1);
    zkAppInstance.deploy({ zkappKey: zkAppPrivkey });
  });
  await txn.send().wait();

  console.log('after transaction');

  // initial state
  let b = await Mina.getAccount(zkAppPubkey);
  console.log('initial state of the zkApp');
  for (const i in [0, 1, 2, 3, 4, 5, 6, 7]) {
    console.log('state', i, ':', b.zkapp?.appState[i].toString());
  }

  console.log('\ninitial board');
  new Board(b.zkapp?.appState?.[0]!).printState();

  // play
  console.log('\n\n====== FIRST MOVE ======\n\n');
  txn = await Local.transaction(player1, async () => {
    const x = Field.zero;
    const y = Field.zero;
    const signature = Signature.create(player1, [x, y]);
    zkAppInstance.play(
      player1Public,
      signature,
      Field.zero,
      Field.zero,
      player1Public,
      player2Public
    );
    zkAppInstance.sign(zkAppPrivkey);
    zkAppInstance.self.body.incrementNonce = Bool(true);
  });
  txn.send().wait();

  // debug
  b = await Mina.getAccount(zkAppPubkey);
  new Board(b.zkapp?.appState?.[0]!).printState();

  // play
  console.log('\n\n====== SECOND MOVE ======\n\n');
  txn = await Local.transaction(player1, async () => {
    const x = Field.one;
    const y = Field.zero;
    const signature = Signature.create(player2, [x, y]);
    zkAppInstance.play(
      player2Public,
      signature,
      Field.one,
      Field.zero,
      player1Public,
      player2Public
    );
    zkAppInstance.sign(zkAppPrivkey);
    zkAppInstance.self.body.incrementNonce = Bool(true);
  });
  txn.send().wait();

  // debug
  b = await Mina.getAccount(zkAppPubkey);
  new Board(b.zkapp?.appState?.[0]!).printState();

  // play
  console.log('\n\n====== THIRD MOVE ======\n\n');
  txn = await Local.transaction(player1, async () => {
    const x = Field.one;
    const y = Field.one;
    const signature = Signature.create(player1, [x, y]);
    zkAppInstance.play(
      player1Public,
      signature,
      Field.one,
      Field.one,
      player1Public,
      player2Public
    );
    zkAppInstance.sign(zkAppPrivkey);
    zkAppInstance.self.body.incrementNonce = Bool(true);
  });
  txn.send().wait();

  // debug
  b = await Mina.getAccount(zkAppPubkey);
  new Board(b.zkapp?.appState?.[0]!).printState();

  // play
  console.log('\n\n====== FOURTH MOVE ======\n\n');
  const two = new Field(2);
  txn = await Local.transaction(player2, async () => {
    const x = two;
    const y = Field.one;
    const signature = Signature.create(player2, [x, y]);
    zkAppInstance.play(
      player2Public,
      signature,
      two,
      Field.one,
      player1Public,
      player2Public
    );
    zkAppInstance.sign(zkAppPrivkey);
    zkAppInstance.self.body.incrementNonce = Bool(true);
  });
  await txn.send().wait();

  // debug
  b = await Mina.getAccount(zkAppPubkey);
  new Board(b.zkapp?.appState?.[0]!).printState();

  // play
  console.log('\n\n====== FIFTH MOVE ======\n\n');
  txn = await Local.transaction(player1, async () => {
    const x = two;
    const y = two;
    const signature = Signature.create(player1, [x, y]);
    zkAppInstance.play(
      player1Public,
      signature,
      two,
      two,
      player1Public,
      player2Public
    );
    zkAppInstance.sign(zkAppPrivkey);
    zkAppInstance.self.body.incrementNonce = Bool(true);
  });
  await txn.send().wait();

  // debug
  b = await Mina.getAccount(zkAppPubkey);
  new Board(b.zkapp?.appState?.[0]!).printState();
  console.log(
    'did someone win?',
    b.zkapp?.appState[2].toString() ? 'Player 1!' : 'Player 2!'
  );

  // cleanup
  await shutdown();
}

main();
