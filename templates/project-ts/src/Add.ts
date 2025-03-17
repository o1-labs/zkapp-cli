import { Field, SmartContract, state, State, method } from 'o1js';
import { AddProgramProof } from './AddZKprogram';

/**
 * Basic Example
 * See https://docs.minaprotocol.com/zkapps for more info.
 *
 * The Add contract verifies a ZKprogram proof and updates a 'num' state variable.
 * When the 'settleAddProgramState' method is called, the Add contract verifies a
 * proof from the 'AddZKprogram' and saves the 'num' value to the contract state.
 *
 * This file is safe to delete and replace with your own contract.
 */
export class Add extends SmartContract {
  @state(Field) num = State<Field>();

  @method async settleZKprogramState(proof: AddProgramProof) {
    proof.verify();
    const addProgramState = proof.publicOutput;
    this.num.set(addProgramState);
  }
}
