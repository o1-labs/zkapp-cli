import { Field, SmartContract, state, State, method } from 'o1js';
import { AddProgramProof } from './AddZkProgram.js';

/**
 * Basic Example
 * See https://docs.minaprotocol.com/zkapps for more info.
 *
 * The Add contract verifies a ZkProgram proof and updates a 'num' state variable.
 * When the 'settleState' method is called, the Add contract verifies a
 * proof from the 'AddZkProgram' and saves the 'num' value to the contract state.
 *
 * This file is safe to delete and replace with your own contract.
 */
export class Add extends SmartContract {
  @state(Field) num = State<Field>();

  @method async settleState(proof: AddProgramProof) {
    proof.verify();
    this.num.requireEquals(proof.publicInput);
    const addProgramState = proof.publicOutput;
    this.num.set(addProgramState);
  }
}
