import {
  Field,
  PublicKey,
  SmartContract,
  state,
  State,
  method,
  UInt64,
} from 'snarkyjs';

/**
 * Basic Example
 * See https://docs.minaprotocol.com/snapps for more info.
 *
 * The Add contract initializes the state variable 'num' to be a Field(1) value by default when deployed.
 * When the 'update' method is called, the Add contract adds Field(2) to its 'num' contract state.
 */
export default class Add extends SmartContract {
  @state(Field) num: State<Field>;

  constructor(
    initialBalance: UInt64,
    address: PublicKey,
    num: Field = Field(1)
  ) {
    super(address);
    this.balance.addInPlace(initialBalance);
    this.num = State.init(num);
  }

  @method async update() {
    const currentState = await this.num.get();
    const newState = currentState.add(2);
    newState.assertEquals(currentState.add(2));
    this.num.set(newState);
  }
}
