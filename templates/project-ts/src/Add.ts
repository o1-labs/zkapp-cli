import { Field, SmartContract, state, State, method } from 'o1js';
import { AddProgramProof } from './AddZKprogram';

/**
 * Basic Example
 * See https://docs.minaprotocol.com/zkapps for more info.
 *
 * The Add contract initializes the state variable 'num' to be a Field(1) value by default when deployed.
 * When the 'update' method is called, the Add contract adds Field(2) to its 'num' contract state.
 *
 * This file is safe to delete and replace with your own contract.
 */
export class Add extends SmartContract {
  @state(Field) num = State<Field>();

  @method async settleAddProgramState(proof: AddProgramProof) {
    proof.verify();
    const addProgramState = proof.publicOutput;
    this.num.set(addProgramState);
  }
}
