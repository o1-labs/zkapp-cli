import {
  Field,
  PrivateKey,
  SmartContract,
  state,
  State,
  method,
} from 'snarkyjs';

/**
 * Basic Example
 * See https://docs.minaprotocol.com/zkapps for more info.
 *
 * The Add contract initializes the state variable 'num' to be a Field(1) value by default when deployed.
 * When the 'update' method is called, the Add contract adds Field(2) to its 'num' contract state.
 */
export class Add extends SmartContract {
  @state(Field) num = State<Field>();

  // initialization
  deploy(args: {
    verificationKey?: string | undefined;
    zkappKey?: PrivateKey | undefined;
  }) {
    super.deploy(args);
    this.num.set(Field(1));
  }

  @method update() {
    const currentState = this.num.get();
    const newState = currentState.add(2);
    newState.assertEquals(currentState.add(2));
    this.num.set(newState);
  }
}
