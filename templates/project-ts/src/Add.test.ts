import { AccountUpdate, Field, Mina, PrivateKey, PublicKey } from 'o1js';
import { Add } from './Add.js';
import { AddZkProgram } from './AddZkProgram.js';
import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

const proofsEnabled = true;

describe('Add', () => {
  let deployerAccount: Mina.TestPublicKey,
    deployerKey: PrivateKey,
    senderAccount: Mina.TestPublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Add;

  before(async () => {
    await AddZkProgram.compile({ proofsEnabled });
    if (proofsEnabled) {
      await Add.compile();
    }
  });

  beforeEach(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployerAccount, senderAccount] = Local.testAccounts;
    deployerKey = deployerAccount.key;
    senderKey = senderAccount.key;

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Add(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('initilaizes the  `AddZKprogram`', async () => {
    await localDeploy();

    const { proof } = await AddZkProgram.init(Field(1));

    assert.deepStrictEqual(proof.publicOutput, Field(1));
  });

  it('correctly settles `AddZKprogram` state on the `Add` smart contract', async () => {
    await localDeploy();
    const initialState = zkApp.num.get();

    const init = await AddZkProgram.init(initialState);
    const update = await AddZkProgram.update(initialState, init.proof);

    // settleState transaction
    const txn = await Mina.transaction(senderAccount, async () => {
      await zkApp.settleState(update.proof);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const updatedNum = zkApp.num.get();
    assert.deepStrictEqual(updatedNum, Field(1));
  });
});
