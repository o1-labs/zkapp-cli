/**
 * This file specifies how to run the `TicTacToe` smart contract locally using the `Mina.LocalBlockchain()` method.
 * The `Mina.LocalBlockchain()` method specifies a ledger of accounts and contains logic for updating the ledger.
 *
 * Please note that this deployment is local and does not deploy to a live network.
 * If you wish to deploy to a live network, please use the zkapp-cli to deploy.
 *
 * To run locally:
 * Build the project: `$ npm run build`
 * Run with node:     `$ node build/src/run.js`.
 */

import { Field, PrivateKey, Mina, shutdown, isReady } from 'snarkyjs';
import { createLocalBlockchain, makeMove, deploy } from './tictactoe-lib.js';
import { TicTacToe, Board } from './tictactoe.js';

async function playTicTacToe() {
  await isReady;

  const [player1, player2] = createLocalBlockchain();
  const player1Public = player1.toPublicKey();
  const player2Public = player2.toPublicKey();

  const zkAppPrivkey = PrivateKey.random();
  const zkAppPubkey = zkAppPrivkey.toPublicKey();
  const zkAppInstance = new TicTacToe(zkAppPubkey);

  // Create a new instance of the contract
  console.log('\n\n====== DEPLOYING ======\n\n');
  await deploy(zkAppInstance, zkAppPrivkey, player1);

  console.log('after transaction');

  // initial state
  let b = await Mina.getAccount(zkAppPubkey);

  console.log('initial state of the zkApp');
  for (const i in [0, 1, 2, 3, 4, 5, 6, 7]) {
    console.log('state', i, ':', b.appState?.[i].toString());
  }

  console.log('\ninitial board');
  new Board(b.appState?.[0]!).printState();

  // play
  console.log('\n\n====== FIRST MOVE ======\n\n');
  await makeMove(
    zkAppInstance,
    zkAppPrivkey,
    player1,
    player1Public,
    player2Public,
    Field.zero,
    Field.zero
  );

  // debug
  b = await Mina.getAccount(zkAppPubkey);
  new Board(b.appState?.[0]!).printState();

  // play
  console.log('\n\n====== SECOND MOVE ======\n\n');
  await makeMove(
    zkAppInstance,
    zkAppPrivkey,
    player2,
    player1Public,
    player2Public,
    Field.one,
    Field.zero
  );
  // debug
  b = await Mina.getAccount(zkAppPubkey);
  new Board(b.appState?.[0]!).printState();

  // play
  console.log('\n\n====== THIRD MOVE ======\n\n');
  await makeMove(
    zkAppInstance,
    zkAppPrivkey,
    player1,
    player1Public,
    player2Public,
    Field.one,
    Field.one
  );
  // debug
  b = await Mina.getAccount(zkAppPubkey);
  new Board(b.appState?.[0]!).printState();

  // play
  console.log('\n\n====== FOURTH MOVE ======\n\n');
  await makeMove(
    zkAppInstance,
    zkAppPrivkey,
    player2,
    player1Public,
    player2Public,
    Field(2),
    Field.one
  );

  // debug
  b = await Mina.getAccount(zkAppPubkey);
  new Board(b.appState?.[0]!).printState();

  // play
  console.log('\n\n====== FIFTH MOVE ======\n\n');
  await makeMove(
    zkAppInstance,
    zkAppPrivkey,
    player1,
    player1Public,
    player2Public,
    Field(2),
    Field(2)
  );

  // debug
  b = await Mina.getAccount(zkAppPubkey);
  new Board(b.appState?.[0]!).printState();
  console.log(
    'did someone win?',
    b.appState?.[2].toString() ? 'Player 1!' : 'Player 2!'
  );

  // cleanup
  await shutdown();
}

playTicTacToe();
